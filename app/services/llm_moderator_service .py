"""
════════════════════════════════════════════════════════════════
llm_moderator_service.py  — v2
Doctor Smile — Cerveau IA de prétraitement
════════════════════════════════════════════════════════════════

Rôle : recevoir les données financières BRUTES uploadées par
       l'utilisateur (n'importe quel format, n'importe quelle
       langue, Cameroun, OHADA, Europe…) et retourner un
       JSON normalisé propre, prêt pour le pipeline ML.

Moteur LLM : Groq (llama-3.3-70b) — appel SÉPARÉ du chat.
Fallback    : Gemini Flash si GROQ indisponible.
Mode        : optionnel (activé via use_llm_moderator=True).

Ce service s'insère dans le pipeline :
  Fichier brut → [LLM Moderator] → features normalisées
              → preprocessing_service.py → ML → score

════════════════════════════════════════════════════════════════
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

import numpy as np
import pandas as pd

log = logging.getLogger("doctorsmile.llm_moderator")

# ════════════════════════════════════════════════════════════════
#  PROMPT SYSTÈME — Séparé du chat, dédié au prétraitement
# ════════════════════════════════════════════════════════════════

MODERATOR_SYSTEM_PROMPT = """Tu es le Modérateur Financier IA de Doctor Smile.
Ta seule mission : analyser des données financières brutes et produire un JSON normalisé.
Tu es expert-comptable, financier OHADA/SYSCOHADA et analyste financier international.
Tu comprends les réalités terrain : Cameroun, Afrique francophone, Europe, données en FCFA, EUR, USD.
Tu répondras UNIQUEMENT avec un objet JSON valide. Aucun texte avant ou après."""

MODERATOR_USER_PROMPT = """Analyse ces données financières brutes et produis un JSON normalisé.

## DONNÉES BRUTES REÇUES
Format : {format_detected}
Colonnes détectées : {columns}
Contenu :
```
{raw_data}
```

## CONTEXTE DÉCLARÉ
- Entreprise : {entreprise}
- Secteur déclaré : {secteur}
- Pays : {pays}
- Devise supposée : {devise}

## TES MISSIONS (dans l'ordre)

### 1. IDENTIFICATION INTELLIGENTE DES COLONNES
Reconnais chaque colonne même si elle s'appelle :
- "Chiffre d'affaires HT", "CA net", "Ventes", "Produits", "Revenus", "Sales", "Turnover"
- "Résultat d'exploitation", "Bénéfice d'exploitation", "Operating income", "EBIT"  
- "Résultat net", "Bénéfice net", "Profit net", "Net income", "Net profit"
- "Total actif", "Total bilan", "Actif total", "Total assets", "Somme bilan"
- "Capitaux propres", "Fonds propres", "CP", "Equity", "Net assets"
- "Dettes totales", "Total passif exigible", "Total dettes", "Total liabilities"
- "Passif courant", "Dettes CT", "Current liabilities", "Dettes à court terme"
- "Actif courant", "Actif circulant", "Current assets", "AC"
- "Trésorerie", "Disponibilités", "Cash", "Liquidités", "Banque + Caisse"
- "EBITDA", "EBE", "Excédent brut d'exploitation", "Gross operating income"
- "Charges financières", "Frais financiers", "Intérêts", "Interest expense"
- "Stocks", "Inventaires", "Marchandises", "Inventory"
- "Créances clients", "Clients", "Débiteurs", "Accounts receivable"
- "Immobilisations", "Actif immobilisé", "Immob nettes", "Fixed assets"
- "Amortissements", "Dotations", "Depreciation"
- Numéros de postes SYSCOHADA : 70, 71, 72, 74, 13, 20, 21, 22, 40, 41, 42, 50, 51, 52, 16, 17, 18...

### 2. CORRECTION DES FORMATS COURANTS CAMEROUN / AFRIQUE
- Nombres avec espaces : "1 234 567" → 1234567.0
- Virgule décimale : "45,320" → 45320.0 (si c'est un séparateur de milliers) ou 45.32 (si décimal)
- Parenthèses pour négatif : "(2 450 000)" → -2450000.0
- Tiret pour zéro : "-" ou "—" → 0.0
- Mentions "k" ou "K" → ×1000, "M" ou "m" → ×1000000
- FCFA : garder la valeur absolue sans conversion
- "néant", "NIL", "N/A", "NC", "/" → null (valeur inconnue)
- Pourcentages : "12,5%" → 12.5 (stocker en valeur, pas en décimal)
- Cellules fusionnées ou totaux de section : ignorer si c'est un doublon

### 3. DÉTECTION DES ANOMALIES COURANTES
Signale (sans bloquer) :
- Actif ≠ Passif + Capitaux propres (déséquilibre bilan)
- Résultat net négatif alors que marge EBITDA positive sans explication
- Valeurs négatives impossibles (trésorerie, actif total, stocks)
- Données multi-années mélangées dans le même fichier
- Totaux de section confondus avec des lignes de détail
- Données en milliers non mentionnées (si actif_total < 1000 mais CA > actif_total)

### 4. ESTIMATION INTELLIGENTE DES VALEURS MANQUANTES
Si une valeur n'est pas dans le fichier :
- Essaie de la calculer depuis les autres données disponibles
  (ex: EBITDA = Résultat net + Charges financières + Impôts + Amortissements)
  (ex: Actif courant = Total actif - Immobilisations)
  (ex: Dettes CT = Total passif exigible - Dettes LT)
- Si vraiment impossible à calculer : null (jamais inventer)
- Mentionne-la dans "features_estimees" avec la méthode utilisée

### 5. IDENTIFICATION DU SECTEUR
Si le secteur n'est pas déclaré, déduis-le du contexte :
- Noms de postes ("honoraires", "loyers reçus" → immobilier/services)
- Ratios caractéristiques (stocks élevés → commerce/industrie)
- Nom de l'entreprise s'il est fourni
Normalise vers : agriculture, industrie_manufacturiere, btp_construction,
commerce_detail, commerce_gros, services_financiers, transport_logistique,
telecom_tech, sante_pharmacie, education_formation, hotellerie_restauration,
energie_mines, immobilier, services_aux_entreprises, autre

## FORMAT DE RÉPONSE ATTENDU
Réponds UNIQUEMENT avec ce JSON (sans texte avant ou après) :

{{
  "entreprise": "nom détecté ou fourni",
  "secteur": "secteur_normalise",
  "annee": 2024,
  "devise": "FCFA",
  "pays": "Cameroun",
  "features": {{
    "chiffre_affaires": null,
    "resultat_net": null,
    "total_actif": null,
    "capitaux_propres": null,
    "dettes_totales": null,
    "dettes_ct": null,
    "actif_courant": null,
    "tresorerie": null,
    "ebitda": null,
    "ebit": null,
    "charges_financieres": null,
    "stocks": null,
    "creances_clients": null,
    "immobilisations": null,
    "amortissements": null,
    "marge_brute": null,
    "resultat_exploitation": null,
    "bfr": null,
    "capitaux_propres_net": null,
    "dettes_lt": null,
    "annees_activite": null,
    "effectif": null
  }},
  "qualite": {{
    "score_confiance": 85,
    "features_trouvees": ["chiffre_affaires", "resultat_net"],
    "features_estimees": [
      {{"feature": "ebitda", "methode": "resultat_net + charges_financieres + amortissements"}}
    ],
    "features_manquantes": ["effectif", "annees_activite"],
    "corrections": [
      "chiffre_affaires: '1 234 567 FCFA' → 1234567.0",
      "resultat_net: '(450 000)' → -450000.0 (négatif)"
    ],
    "anomalies": [
      "Déséquilibre bilan : actif (150M) ≠ passif + CP (148M), écart 2M"
    ],
    "format_source": "Excel SYSCOHADA / CSV FR / Saisie manuelle",
    "recommandation": "haute_confiance",
    "notes_contexte": "Données typiques PME camerounaise, exercice 2023"
  }},
  "synthese": "Résumé en 2-3 phrases du profil financier détecté et des principales observations."
}}

RAPPEL : recommandation = "haute_confiance" (>70%), "verification_recommandee" (40-70%), "saisie_manuelle" (<40%)
"""

# ════════════════════════════════════════════════════════════════
#  MAPPING : features LLM → features preprocessing_service.py
# ════════════════════════════════════════════════════════════════

# Ce que le LLM retourne → ce que preprocessing_service comprend
LLM_TO_PREPROCESSING: dict[str, str] = {
    "chiffre_affaires":      "chiffre_affaires",
    "resultat_net":          "resultat_net",
    "total_actif":           "actif_total",
    "capitaux_propres":      "capitaux_propres",
    "capitaux_propres_net":  "capitaux_propres",
    "dettes_totales":        "dettes_totales",
    "dettes_ct":             "passif_courant",     # ← passif courant = dettes CT
    "dettes_lt":             "dettes_lt",
    "actif_courant":         "actif_courant",
    "tresorerie":            "tresorerie",
    "ebitda":                "ebitda",
    "ebit":                  "resultat_exploitation",
    "resultat_exploitation":  "resultat_exploitation",
    "charges_financieres":   "charges_financieres",
    "stocks":                "stocks",
    "creances_clients":      "creances_clients",
    "immobilisations":       "immobilisations",
    "amortissements":        "amortissements",
    "marge_brute":           "marge_brute",
    "bfr":                   "bfr",
    "annees_activite":       "annees_activite",
    "effectif":              "effectif",
}


# ════════════════════════════════════════════════════════════════
#  SERVICE PRINCIPAL
# ════════════════════════════════════════════════════════════════

class LLMModeratorService:
    """
    Cerveau IA de prétraitement Doctor Smile.

    Usage :
        service = LLMModeratorService()
        result  = await service.moderate(raw_df, entreprise="SARL XYZ", pays="Cameroun")

    Le résultat contient :
        result["rows_for_preprocessing"]  → liste de dicts directement
                                             passable à service.predict(rows=...)
        result["qualite"]                 → rapport de confiance
        result["synthese"]                → résumé LLM de la situation
        result["corrections"]             → transformations appliquées
    """

    def __init__(self) -> None:
        self._groq_client  = None
        self._gemini_model = None

    # ────────────────────────────────────────────────────────────
    #  CLIENT GROQ (lazy — appel séparé du chat)
    # ────────────────────────────────────────────────────────────

    def _get_groq(self):
        if self._groq_client is not None:
            return self._groq_client
        import os
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            return None
        try:
            from groq import Groq
            self._groq_client = Groq(api_key=api_key)
            log.info("[LLM Moderator] Groq (llama-3.3-70b) initialisé")
            return self._groq_client
        except Exception as e:
            log.error("[LLM Moderator] Groq init: %s", e)
            return None

    # ────────────────────────────────────────────────────────────
    #  CLIENT GEMINI (fallback)
    # ────────────────────────────────────────────────────────────

    def _get_gemini(self):
        if self._gemini_model is not None:
            return self._gemini_model
        import os
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            return None
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            self._gemini_model = genai.GenerativeModel(
                model_name="gemini-2.0-flash",
                generation_config=genai.GenerationConfig(
                    temperature=0.05,        # Très bas : précision maximale
                    max_output_tokens=2048,
                    response_mime_type="application/json",
                ),
            )
            log.info("[LLM Moderator] Gemini Flash initialisé (fallback)")
            return self._gemini_model
        except Exception as e:
            log.error("[LLM Moderator] Gemini init: %s", e)
            return None

    # ────────────────────────────────────────────────────────────
    #  POINT D'ENTRÉE PRINCIPAL
    # ────────────────────────────────────────────────────────────

    async def moderate(
        self,
        raw_df: pd.DataFrame,
        entreprise: str = "Inconnue",
        secteur: str   = "autre",
        pays: str      = "Cameroun",
        devise: str    = "FCFA",
    ) -> dict[str, Any]:
        """
        Prétraitement LLM intelligent des données financières brutes.

        Retourne un dict avec :
          - rows_for_preprocessing : list[dict] → à passer à service.predict()
          - qualite                : dict → rapport qualité/confiance
          - synthese               : str  → résumé LLM
          - corrections            : list → transformations appliquées
          - anomalies              : list → incohérences détectées
          - llm_used               : str  → "groq" | "gemini" | "fallback"
        """
        raw_text, format_detected = self._df_to_readable(raw_df)
        columns_str = str(list(raw_df.columns))

        user_prompt = MODERATOR_USER_PROMPT.format(
            format_detected=format_detected,
            columns=columns_str,
            raw_data=raw_text[:5000],  # Limite tokens — 5k chars suffisent
            entreprise=entreprise,
            secteur=secteur,
            pays=pays,
            devise=devise,
        )

        # ── Priorité 1 : Groq (llama-3.3-70b) ───────────────────
        groq = self._get_groq()
        if groq:
            try:
                raw_json = await self._call_groq(groq, user_prompt)
                result   = self._parse_response(raw_json)
                result["llm_used"] = "groq_llama3.3"
                log.info("[LLM Moderator] Groq ✓ — confiance=%s%%",
                         result.get("qualite", {}).get("score_confiance", "?"))
                return self._finalize(result, raw_df)
            except Exception as e:
                log.warning("[LLM Moderator] Groq erreur (%s) → Gemini fallback", e)

        # ── Priorité 2 : Gemini Flash ────────────────────────────
        gemini = self._get_gemini()
        if gemini:
            try:
                raw_json = await self._call_gemini(gemini, user_prompt)
                result   = self._parse_response(raw_json)
                result["llm_used"] = "gemini_flash"
                log.info("[LLM Moderator] Gemini ✓ — confiance=%s%%",
                         result.get("qualite", {}).get("score_confiance", "?"))
                return self._finalize(result, raw_df)
            except Exception as e:
                log.warning("[LLM Moderator] Gemini erreur (%s) → fallback heuristique", e)

        # ── Fallback : heuristique ────────────────────────────────
        log.warning("[LLM Moderator] Aucun LLM disponible — fallback heuristique")
        return self._heuristic_fallback(raw_df, entreprise, secteur, pays, devise)

    # ────────────────────────────────────────────────────────────
    #  APPEL GROQ
    # ────────────────────────────────────────────────────────────

    async def _call_groq(self, client, user_prompt: str) -> str:
        """Appel Groq séparé du chat — modèle dédié au preprocessing."""
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": MODERATOR_SYSTEM_PROMPT},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.05,       # Très bas pour la précision
            max_tokens=1500,
            response_format={"type": "json_object"},  # Force JSON
        )
        return response.choices[0].message.content.strip()

    # ────────────────────────────────────────────────────────────
    #  APPEL GEMINI
    # ────────────────────────────────────────────────────────────

    async def _call_gemini(self, model, user_prompt: str) -> str:
        full_prompt = MODERATOR_SYSTEM_PROMPT + "\n\n" + user_prompt
        response    = model.generate_content(full_prompt)
        return response.text.strip()

    # ────────────────────────────────────────────────────────────
    #  CONVERSION DATAFRAME → TEXTE LISIBLE PAR LE LLM
    # ────────────────────────────────────────────────────────────

    def _df_to_readable(self, df: pd.DataFrame) -> tuple[str, str]:
        """
        Convertit un DataFrame en texte structuré pour le LLM.
        Détecte automatiquement le format.
        """
        lines: list[str] = []

        # Détecter le format
        col_names = list(df.columns)
        has_numeric_index = all(
            str(c).isdigit() or str(c).startswith("Unnamed") for c in col_names[:2]
        )

        # Format détecté
        if len(df) == 1:
            fmt = "Ligne unique de données (ratios ou postes)"
        elif len(df.columns) == 2:
            fmt = "Format deux colonnes : libellé | valeur (type bilan)"
        elif any(str(c).startswith("20") and len(str(c)) == 4 for c in col_names):
            fmt = "Série temporelle (colonnes = années)"
        else:
            fmt = f"Tableau {len(df)} lignes × {len(df.columns)} colonnes"

        # Toutes les colonnes + premières valeurs
        lines.append(f"=== STRUCTURE ({fmt}) ===")
        lines.append(f"Dimensions : {len(df)} lignes × {len(df.columns)} colonnes")
        lines.append(f"Colonnes : {col_names}")
        lines.append("")

        # Si format "libellé | valeur" (2 colonnes) — très fréquent Cameroun
        if len(df.columns) == 2:
            lines.append("=== CONTENU COMPLET ===")
            for _, row in df.iterrows():
                vals = list(row.values)
                lines.append(f"  {vals[0]} : {vals[1]}")
        else:
            # Format tableau standard
            lines.append("=== PREMIÈRES LIGNES ===")
            lines.append(df.head(30).to_string(index=False))

            # Valeurs uniques pour colonnes à faible cardinalité
            for col in df.columns:
                unique_vals = df[col].dropna().unique()
                if len(unique_vals) <= 8 and len(unique_vals) > 0:
                    lines.append(f"  Valeurs '{col}' : {list(unique_vals)}")

        return "\n".join(lines), fmt

    # ────────────────────────────────────────────────────────────
    #  PARSING RÉPONSE LLM
    # ────────────────────────────────────────────────────────────

    def _parse_response(self, text: str) -> dict[str, Any]:
        """Parse le JSON retourné par le LLM avec fallback robuste."""
        # Nettoyer les backticks éventuels
        text = re.sub(r"```json\s*|\s*```", "", text).strip()

        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            # Extraire le premier objet JSON trouvé
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                data = json.loads(match.group())
            else:
                raise ValueError(f"Réponse LLM non-JSON : {text[:200]}")

        # Valider structure minimale
        if "features" not in data:
            raise ValueError("Réponse LLM sans clé 'features'")

        # Nettoyer les valeurs numériques dans features
        for key, val in data.get("features", {}).items():
            if val is None:
                continue
            if isinstance(val, str):
                # Tenter de nettoyer et convertir
                cleaned = (
                    val.strip()
                    .replace(" ", "")
                    .replace("\u00a0", "")   # espace insécable
                    .replace(",", ".")
                    .replace("(", "-")
                    .replace(")", "")
                    .replace("FCFA", "")
                    .replace("EUR", "")
                    .replace("$", "")
                    .replace("k", "e3")
                    .replace("K", "e3")
                    .replace("M", "e6")
                    .rstrip(".")
                )
                try:
                    data["features"][key] = float(cleaned) if cleaned else None
                except (ValueError, TypeError):
                    data["features"][key] = None
            elif isinstance(val, (int, float)):
                data["features"][key] = float(val) if np.isfinite(float(val)) else None

        return data

    # ────────────────────────────────────────────────────────────
    #  FINALISATION : Convertir en rows pour preprocessing_service
    # ────────────────────────────────────────────────────────────

    def _finalize(self, llm_result: dict, raw_df: pd.DataFrame) -> dict[str, Any]:
        """
        Transforme le résultat LLM en format attendu par preprocessing_service.predict().

        Le preprocessing_service attend des rows = list[dict] avec des clés
        reconnues par COL_ALIASES. On lui passe directement les clés internes.
        """
        features_llm = llm_result.get("features", {})
        qualite      = llm_result.get("qualite", {})

        # Construire la row compatible preprocessing_service
        # (noms de clés = COL_ALIASES du preprocessing_service)
        row: dict[str, Any] = {}

        for llm_key, preproc_key in LLM_TO_PREPROCESSING.items():
            val = features_llm.get(llm_key)
            if val is not None:
                row[preproc_key] = val

        # Ajouter les métadonnées contextuelles
        if llm_result.get("secteur"):
            row["secteur"] = llm_result["secteur"]
        if llm_result.get("pays"):
            row["pays"] = llm_result["pays"]
        if features_llm.get("annees_activite"):
            row["annees_activite"] = features_llm["annees_activite"]

        # Score de confiance global
        score_confiance = qualite.get("score_confiance", 0)
        n_found = len([v for v in features_llm.values() if v is not None])
        n_total = len(features_llm)

        # Calculer pct_missing pour le preprocessing_service
        # (feature utilisée par le ML pour détecter la qualité des données)
        row["pct_missing"] = round(1.0 - n_found / max(n_total, 1), 3)

        return {
            "rows_for_preprocessing": [row],     # ← directement passable à service.predict()
            "entreprise":   llm_result.get("entreprise", "Inconnue"),
            "secteur":      llm_result.get("secteur", "autre"),
            "annee":        llm_result.get("annee", 2024),
            "devise":       llm_result.get("devise", "FCFA"),
            "pays":         llm_result.get("pays", "Cameroun"),
            "qualite":      qualite,
            "synthese":     llm_result.get("synthese", ""),
            "corrections":  qualite.get("corrections", []),
            "anomalies":    qualite.get("anomalies", []),
            "score_confiance": score_confiance,
            "llm_used":     llm_result.get("llm_used", "unknown"),
            "features_llm": features_llm,   # Pour audit/debug
        }

    # ────────────────────────────────────────────────────────────
    #  FALLBACK HEURISTIQUE (si LLM indisponible)
    # ────────────────────────────────────────────────────────────

    def _heuristic_fallback(
        self,
        df: pd.DataFrame,
        entreprise: str,
        secteur: str,
        pays: str,
        devise: str,
    ) -> dict[str, Any]:
        """
        Fallback robuste si Groq ET Gemini sont indisponibles.
        Utilise les COL_ALIASES du preprocessing_service directement.
        """
        from .preprocessing_service import COL_ALIASES
        import unicodedata

        def normalize_key(k: str) -> str:
            k = str(k).lower().strip()
            k = unicodedata.normalize("NFD", k)
            k = "".join(c for c in k if unicodedata.category(c) != "Mn")
            k = k.replace(" ", "_").replace("'", "_").replace("-", "_")
            return COL_ALIASES.get(k, k)

        def parse_value(v) -> float | None:
            if v is None:
                return None
            s = (
                str(v).strip()
                .replace(" ", "").replace("\u00a0", "")
                .replace(",", ".").replace("(", "-").replace(")", "")
                .replace("FCFA", "").replace("EUR", "").replace("$", "")
            )
            try:
                f = float(s)
                return f if np.isfinite(f) else None
            except (ValueError, TypeError):
                return None

        row: dict[str, Any] = {}
        corrections: list[str] = []

        for col in df.columns:
            norm_key = normalize_key(col)
            if len(df) > 0:
                raw_val = df[col].iloc[0]
                parsed  = parse_value(raw_val)
                if parsed is not None:
                    row[norm_key] = parsed
                    if str(raw_val) != str(parsed):
                        corrections.append(f"{col}: '{raw_val}' → {parsed}")

        row["secteur"] = secteur
        row["pays"]    = pays

        found = len([v for v in row.values() if v is not None and isinstance(v, (int, float))])
        score = min(100, int(found / 15 * 100))  # 15 features de base

        row["pct_missing"] = round(1.0 - found / 15, 3)

        return {
            "rows_for_preprocessing": [row],
            "entreprise":    entreprise,
            "secteur":       secteur,
            "annee":         2024,
            "devise":        devise,
            "pays":          pays,
            "qualite": {
                "score_confiance": score,
                "features_trouvees": list(row.keys()),
                "features_estimees": [],
                "features_manquantes": [],
                "corrections": corrections,
                "anomalies": [],
                "format_source": "Fallback heuristique (LLM indisponible)",
                "recommandation": "verification_recommandee" if score > 40 else "saisie_manuelle",
            },
            "synthese": f"Extraction automatique sans LLM ({score}% de confiance). Vérification recommandée.",
            "corrections": corrections,
            "anomalies":   [],
            "score_confiance": score,
            "llm_used":   "fallback_heuristique",
            "features_llm": {},
        }


# ── Singleton ──────────────────────────────────────────────────
llm_moderator_service = LLMModeratorService()
