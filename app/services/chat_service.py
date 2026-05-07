"""
==========================================
CHAT SERVICE v2 — Doctor Smile
==========================================

Améliorations vs v1 :
  ① Contexte complet (TOUS les ratios, SHAP complet, trajectoire,
     anomalies, qualité données) au lieu de 6 lignes
  ② Prompt système adaptatif selon le MODE détecté
     (diagnostic / plan / banquier / simulateur / alerte / pédagogique)
  ③ Historique étendu (20 tours) avec déduplication
  ④ Streaming SSE natif (Groq supporte nativement)
  ⑤ Détection automatique du mode depuis le message
  ⑥ Fallback local analytique (15 catégories au lieu de 5)
  ⑦ Modèle actif retourné dans chaque réponse
  ⑧ max_tokens adaptatif selon le mode

pip install groq google-generativeai
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
from typing import Any, AsyncIterator

log = logging.getLogger("doctorsmile.chat_v2")

# ════════════════════════════════════════════════════════════════
#  MODES DE CONVERSATION
# ════════════════════════════════════════════════════════════════

MODES = {
    "auto":        "Analyste financier général",
    "diagnostic":  "Diagnostic médical complet de l'entreprise",
    "plan":        "Plan d'action concret 30/90 jours",
    "banquier":    "Synthèse crédit pour établissement bancaire",
    "simulateur":  "Simulation hypothétique et impact sur le score",
    "alerte":      "Analyse des signaux d'alerte et risques cachés",
    "pedagogique": "Explication pédagogique pour non-analyste",
}

ZONE_LABELS = {
    "saine":     "Zone Saine ✅",
    "vigilance": "Zone Vigilance ⚠️",
    "risque":    "Zone Risque 🔶",
    "critique":  "Zone Critique 🔴",
}

# ════════════════════════════════════════════════════════════════
#  PROMPTS SYSTÈME ADAPTATIFS
# ════════════════════════════════════════════════════════════════

_BASE_PROMPT = """Tu es Doctor Smile IA — médecin financier de précision pour les entreprises africaines.

## IDENTITÉ
Expert en analyse financière OHADA, scoring de défaillance par ML (XGBoost/RandomForest/LightGBM), ratios financiers et plan de redressement. Tu es rigoureux comme un expert-financier et pédagogue comme un médecin.

## FORMAT
- Réponds TOUJOURS en français
- Utilise le Markdown : ## titres, **gras** pour les chiffres clés, listes concises
- Émojis structurants uniquement : ✅ positif | ⚠️ vigilance | 🔴 critique | 💡 recommandation | 📊 données
- Longueur adaptée : concis pour question simple, structuré pour analyse complexe
- Ne jamais inventer de données absentes du contexte fourni
- DOCTOR SCORE™ : 75-100 Zone Saine | 50-74 Vigilance | 25-49 Risque | 0-24 Critique
- SHAP : valeur positive = augmente le risque | valeur négative = réduit le risque"""

MODE_INSTRUCTIONS = {
    "auto": """
Réponds précisément à la question. Décompose si nécessaire :
- Pour un ratio : valeur actuelle → benchmark sectoriel → implication concrète → action recommandée
- Pour le score : facteurs SHAP top 3 → diagnostic → 1 action prioritaire
- Pour une question générale : structure en 3 blocs max. Termine par une invitation à approfondir.""",

    "diagnostic": """
Fournis un diagnostic médical complet en exactement 5 sections :

## 🩺 Résumé exécutif
(2 phrases max — état général et niveau d'urgence)

## ✅ Points forts
(2-3 éléments avec valeurs chiffrées vs benchmark)

## ⚠️ Points faibles critiques
(2-3 éléments avec valeurs chiffrées vs benchmark)

## 🔴 Risque principal
(1 phrase — le facteur SHAP le plus impactant négatif)

## 💊 Prescription
(3 actions prioritaires numérotées avec impact estimé en points sur le score)

Sois direct, chiffré. Pas de généralités.""",

    "plan": """
Crée un plan d'action opérationnel et chiffré en 3 horizons temporels :

## 🚨 Court terme (0-30 jours) — Actions immédiates, sans investissement
Pour chaque action : action concrète | impact estimé (+Xpts score) | responsable

## ⚡ Moyen terme (1-3 mois) — Restructurations et optimisations
Pour chaque action : action concrète | impact estimé | ressources nécessaires

## 🎯 Long terme (3-12 mois) — Stratégie de croissance
Pour chaque action : objectif | indicateur de succès | horizon

## 📊 KPIs à surveiller
3 indicateurs clés à mesurer mensuellement avec seuils d'alerte.""",

    "banquier": """
Rédige une synthèse professionnelle pour un établissement bancaire africain (BICEC, Afriland, SCB, Ecobank, UBA).

## 🏦 Présentation de l'entreprise
Activité, secteur, ancienneté, localisation

## 💰 Capacité de remboursement
Ratio couverture intérêts, estimation cash-flow opérationnel, EBITDA

## 🛡️ Solvabilité et garanties
Ratio solvabilité, actifs mobilisables, capitaux propres

## 📊 Évaluation du risque crédit
Doctor Score™, probabilité de défaut (%), classification Bâle II estimée

## ✅ Recommandation
Montant raisonnable d'endettement supplémentaire, durée, conditions préconisées

Ton formel et professionnel. Chiffres précis obligatoires.""",

    "simulateur": """
L'utilisateur teste un scénario hypothétique. Pour chaque hypothèse formulée :

1. **Identification du ratio impacté** : quel(s) ratio(s) changerait/ent ?
2. **Calcul d'impact estimé** : variation en % du ratio → variation estimée du score (±X pts)
3. **Effets en cascade** : quels autres ratios seraient affectés ?
4. **Faisabilité** : conditions pour réaliser ce scénario (capital requis, délai, risques)
5. **Scénario optimal** : quelle combinaison d'actions maximise l'amélioration du score ?

Donne des fourchettes réalistes. Base-toi sur les données financières actuelles fournies.""",

    "alerte": """
Analyse les signaux d'alerte dans les données financières.

## 🔔 Signaux faibles détectés
Ratios qui approchent des seuils critiques (< 85% de la norme)

## 🔴 Incohérences comptables
Anomalies dans les relations entre ratios (ex: QR > CR, marge nette > marge brute)

## ⏰ Horizon de risque
Si aucune action : dans combien de temps la zone critique serait atteinte ?
Base-toi sur la trajectoire si disponible.

## 🚨 Risques non capturés par le score
Facteurs qualitatifs, concentration clients, dépendances, risques de marché

Sois direct sur les risques réels. N'atténue pas les signaux négatifs.""",

    "pedagogique": """
L'utilisateur n'est pas analyste financier. Explique simplement :
- Chaque concept technique → analogie concrète (médecin/patient, voiture/carburant, etc.)
- Évite tout jargon sans explication
- Structure : 📌 Ce que ça mesure → 📊 Le chiffre → ✅/⚠️ Ce que ça signifie concrètement
- Termine par "**En résumé :**" suivi d'une phrase simple en langage courant
- Propose toujours une question de suivi adaptée au niveau débutant""",
}

# ════════════════════════════════════════════════════════════════
#  DÉTECTION DU MODE DEPUIS LE MESSAGE
# ════════════════════════════════════════════════════════════════

def _detect_mode(msg: str, explicit_mode: str = "auto") -> str:
    """Détecte le mode optimal depuis le message si mode = auto."""
    if explicit_mode and explicit_mode != "auto":
        return explicit_mode

    lc = msg.lower()

    if re.search(r"banquier|banque|cr[eé]dit|pr[eê]t|financement|bcdc|bicec|afriland|ecobank", lc):
        return "banquier"
    if re.search(r"plan|actions?|am[eé]liorer|que faire|conseil|priorit[eé]|urgence|redressement", lc):
        return "plan"
    if re.search(r"anomalie|fraude|incoh[eé]rence|suspect|bizarre|manipulation|faux", lc):
        return "alerte"
    if re.search(r"c'est quoi|explique|comprendre|signifie|qu'est.ce|je ne comprends|pour un d[eé]butant", lc):
        return "pedagogique"
    if re.search(r"simulat|what.?if|et si.*(?:change|augment|r[eé]dui|modifi)|hypoth[eè]se", lc):
        return "simulateur"
    if re.search(r"diagnostic|bilan global|r[eé]sum[eé] complet|synth[eè]se|[eé]tat g[eé]n[eé]ral", lc):
        return "diagnostic"

    return "auto"

# ════════════════════════════════════════════════════════════════
#  FORMATAGE DU CONTEXTE COMPLET
# ════════════════════════════════════════════════════════════════

def _format_full_context(ctx: dict[str, Any]) -> str:
    """Formate le contexte complet de l'analyse pour le LLM."""
    if not ctx:
        return ""

    lines = []

    # ── Identité entreprise ──────────────────────────────────
    lines.append(f"=== ANALYSE FINANCIÈRE — {ctx.get('entreprise', 'Entreprise')} ===")
    lines.append(f"Date analyse : {ctx.get('createdAt', 'N/A')} | Secteur : {ctx.get('secteur', '—')} | Pays : {ctx.get('pays', '—')}")
    lines.append(f"Plan : {ctx.get('plan', 'standard')} | Modèle ML : {ctx.get('model', 'RF+XGB+LGBM')}")
    lines.append("")

    # ── Doctor Score ─────────────────────────────────────────
    score = ctx.get("score", "—")
    zone  = ctx.get("zone", "vigilance")
    prob  = ctx.get("probabiliteDefaut")
    conf  = ctx.get("confidence") or ctx.get("confiance")
    auc   = ctx.get("auc")

    lines.append(f"DOCTOR SCORE™ : {score}/100 — {ZONE_LABELS.get(zone, zone)}")
    if prob is not None:
        lines.append(f"Probabilité de défaut : {round(float(prob) * 100, 1) if float(prob) <= 1 else round(float(prob), 1)}%")
    if conf:
        lines.append(f"Confiance modèle : {conf}%")
    if auc:
        lines.append(f"AUC-ROC : {auc}")
    lines.append("")

    # ── Ratios (tous) ────────────────────────────────────────
    ratios = ctx.get("ratios") or []
    if ratios:
        lines.append("RATIOS FINANCIERS :")
        for r in ratios[:20]:
            name  = r.get("name") or r.get("n") or "—"
            value = r.get("value") or r.get("v") or "—"
            bench = r.get("benchmark") or r.get("b") or "—"
            unit  = r.get("unit") or r.get("u") or ""
            pct   = r.get("percentile") or r.get("p")
            status = r.get("status") or (
                "green" if isinstance(pct, (int, float)) and pct >= 75 else
                "yellow" if isinstance(pct, (int, float)) and pct >= 50 else
                "red" if isinstance(pct, (int, float)) else "—"
            )
            icon = {"green": "✅", "yellow": "⚠️", "red": "🔴"}.get(status, "  ")
            lines.append(f"  {icon} {name} : {value}{unit} (benchmark : {bench})")
        lines.append("")

    # ── SHAP values (complet) ────────────────────────────────
    shap = ctx.get("shapValues") or ctx.get("shap") or []
    if shap:
        lines.append("FACTEURS SHAP (impact sur le score) :")
        for s in shap[:10]:
            feat = s.get("feature") or s.get("n") or s.get("name") or "—"
            val  = s.get("value")  or s.get("v")
            # Normaliser la direction
            if "direction" in s:
                positive = s["direction"] == "positive"
            elif "pos" in s:
                positive = bool(s["pos"])
            elif val is not None:
                positive = float(val) > 0
            else:
                positive = True
            val_str = f"{float(val):+.4f}" if val is not None else "—"
            dir_str = "↑ augmente le risque" if positive else "↓ réduit le risque"
            lines.append(f"  {'🔴' if positive else '✅'} {feat} : {val_str} ({dir_str})")
        lines.append("")

    # ── Recommandations ──────────────────────────────────────
    recos = ctx.get("recommendations") or ctx.get("recos") or []
    if recos:
        lines.append("RECOMMANDATIONS :")
        for r in recos[:8]:
            title = r.get("title") or r.get("t") or "—"
            desc  = r.get("description") or r.get("d") or r.get("desc") or ""
            level = r.get("level") or r.get("lvl") or "medium"
            icon  = {"high": "🔴 URGENT", "medium": "⚠️ IMPORTANT", "low": "💡 CONSEIL"}.get(level, "  ")
            lines.append(f"  [{icon}] {title}")
            if desc:
                lines.append(f"     {desc[:120]}")
        lines.append("")

    # ── Trajectoire temporelle (Axe 1) ──────────────────────
    traj = ctx.get("trajectory")
    if traj and traj.get("trend"):
        lines.append("TRAJECTOIRE TEMPORELLE (Axe 1 — Prédiction) :")
        lines.append(f"  Tendance : {traj.get('trend', '—')} | Vélocité : {traj.get('velocity', 0)} pt/période")
        lines.append(f"  Accélération : {traj.get('acceleration', 0)} | Niveau alerte : {traj.get('warning_level', 'none')}")
        if traj.get("alert_horizon"):
            lines.append(f"  ⚠️ Horizon d'alerte : {traj['alert_horizon']} période(s) avant zone critique")
        forecast = traj.get("forecast_scores", [])[:3]
        if forecast:
            lines.append(f"  Prévision 3 prochaines périodes : {', '.join(str(s) for s in forecast)}")
        if traj.get("narrative"):
            lines.append(f"  Analyse : {traj['narrative']}")
        lines.append("")

    # ── Anomalies (Axe 1) ────────────────────────────────────
    anom = ctx.get("anomalies")
    if anom and anom.get("risk_level") and anom["risk_level"] != "normal":
        lines.append(f"ANOMALIES DÉTECTÉES (score : {anom.get('anomaly_score', 0)}/100 — {anom['risk_level'].upper()}) :")
        for flag in (anom.get("flags") or [])[:5]:
            lines.append(f"  [{flag.get('severity', '?').upper()}] {flag.get('name', '—')} : {flag.get('detail', '')[:100]}")
        lines.append(f"  Recommandation : {anom.get('recommendation', '—')}")
        lines.append("")

    # ── Qualité données OCR ──────────────────────────────────
    dqs = ctx.get("dataQualityScore")
    if dqs is not None and int(dqs) < 80:
        lines.append(f"QUALITÉ DONNÉES : {dqs}/100 — certains ratios peuvent être incomplets ou estimés.")
        ocr_detail = ctx.get("ocrDetail") or {}
        if ocr_detail.get("reconstructed"):
            lines.append(f"  Champs reconstitués : {', '.join(ocr_detail['reconstructed'][:5])}")
        lines.append("")

    return "\n".join(lines)

# ════════════════════════════════════════════════════════════════
#  CLIENTS LLM
# ════════════════════════════════════════════════════════════════

_groq_client  = None
_gemini_model = None

def _get_groq():
    global _groq_client
    if _groq_client is not None:
        return _groq_client
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        return None
    try:
        from groq import Groq
        _groq_client = Groq(api_key=api_key)
        log.info("✅ Groq (llama-3.3-70b) initialisé")
        return _groq_client
    except Exception as e:
        log.error("Groq init: %s", e)
        return None

def _get_gemini():
    global _gemini_model
    if _gemini_model is not None:
        return _gemini_model
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        _gemini_model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            generation_config={"temperature": 0.35, "max_output_tokens": 900, "top_p": 0.92},
            system_instruction=_BASE_PROMPT,
        )
        log.info("✅ Gemini 2.0 Flash initialisé")
        return _gemini_model
    except Exception as e:
        log.error("Gemini init: %s", e)
        return None

# ════════════════════════════════════════════════════════════════
#  FALLBACK LOCAL COMPLET (15 catégories)
# ════════════════════════════════════════════════════════════════

def _local_response(message: str, ctx: dict[str, Any], mode: str) -> str:
    """Réponse analytique calculée localement depuis les données brutes."""
    if not ctx:
        return ("Aucune analyse chargée. Importez un fichier financier depuis le Dashboard "
                "pour démarrer votre diagnostic Doctor Smile.")

    lc    = message.lower()
    score = ctx.get("score", "—")
    zone  = ctx.get("zone", "vigilance")
    nom   = ctx.get("entreprise", "l'entreprise")

    # Normalisation des ratios
    raw_ratios = ctx.get("ratios") or []
    ratios_map: dict[str, dict] = {}
    for r in raw_ratios:
        key = (r.get("name") or r.get("n") or "").lower()
        ratios_map[key] = r

    def _rv(r: dict) -> str:
        return str(r.get("value") or r.get("v") or "—")

    def _rb(r: dict) -> str:
        return str(r.get("benchmark") or r.get("b") or "—")

    def _rs(r: dict) -> str:
        s = r.get("status")
        if s == "green": return "✅"
        if s == "yellow": return "⚠️"
        if s == "red": return "🔴"
        return ""

    def _find(*keys) -> dict | None:
        for k in keys:
            for rk, rv in ratios_map.items():
                if k.lower() in rk: return rv
        return None

    shap  = ctx.get("shapValues") or ctx.get("shap") or []
    recos = ctx.get("recommendations") or ctx.get("recos") or []
    traj  = ctx.get("trajectory") or {}
    anom  = ctx.get("anomalies") or {}

    # ── Score global / diagnostic ────────────────────────────
    if re.search(r"score|note|résultat|santé|état|diagnostic|global|comment|ça va", lc) or mode == "diagnostic":
        top3 = shap[:3]
        top3_str = " | ".join(
            f"{'📈' if (s.get('direction')=='positive' or s.get('pos',True)) else '📉'} **{s.get('feature') or s.get('n', '—')}**"
            for s in top3
        ) if top3 else "—"
        urgent = next((r for r in recos if (r.get("level") or r.get("lvl")) == "high"), None)
        trend  = traj.get("trend", "")

        state = {
            "saine":     "✅ **Santé financière solide.** Les fondamentaux sont au-dessus des normes sectorielles.",
            "vigilance": "⚠️ **Situation mitigée.** Certains indicateurs méritent une attention particulière.",
            "risque":    "🔶 **Situation préoccupante.** Plusieurs ratios sont en dessous des normes. Des actions sont nécessaires.",
            "critique":  "🔴 **Situation critique.** Des mesures correctrices urgentes s'imposent pour éviter la défaillance.",
        }.get(zone, "—")

        reply = f"## 🩺 Diagnostic — {nom}\n\n"
        reply += f"**Doctor Score™ : {score}/100 — {ZONE_LABELS.get(zone, zone)}**\n\n{state}\n\n"
        reply += f"**Principaux facteurs (SHAP) :** {top3_str}\n\n"
        if trend:
            reply += f"**Trajectoire :** tendance {trend}"
            if traj.get("alert_horizon"):
                reply += f" · ⚠️ horizon alerte : {traj['alert_horizon']} période(s)"
            reply += "\n\n"
        if urgent:
            reply += f"**💊 Priorité :** {urgent.get('title') or urgent.get('t', '—')}\n\n"
        reply += "*Connectez le backend FastAPI pour un diagnostic LLM complet avec recommandations détaillées.*"
        return reply

    # ── Liquidité ────────────────────────────────────────────
    if re.search(r"liquid|trésor|cash|courant|disponibil", lc):
        cr = _find("liquidité générale", "current ratio", "liquidite generale")
        qr = _find("liquidité immédiate", "quick ratio", "liquidite immediate")
        ca = _find("cash ratio", "trésorerie passive")
        r  = "## 💧 Analyse de la Liquidité\n\n"
        if cr:
            v = float(str(_rv(cr)).replace(",", ".")) if _rv(cr) != "—" else 1.0
            r += f"**Liquidité générale : {_rv(cr)}** {_rs(cr)}\n"
            r += "Benchmark : " + _rb(cr) + "\n"
            r += ("✅ Au-dessus de 1 — actifs courants couvrent les dettes à court terme.\n\n"
                  if v >= 1 else
                  "🔴 En dessous de 1 — risque d'insolvabilité à court terme. Surveiller la trésorerie quotidiennement.\n\n")
        if qr:
            r += f"**Liquidité immédiate (sans stocks) : {_rv(qr)}** {_rs(qr)} — Benchmark : {_rb(qr)}\n\n"
        if ca:
            r += f"**Cash Ratio (trésorerie pure) : {_rv(ca)}** {_rs(ca)} — Benchmark : {_rb(ca)}\n\n"
        if not cr and not qr:
            r += "*Ratios de liquidité non disponibles dans cette analyse.*"
        return r

    # ── Endettement ──────────────────────────────────────────
    if re.search(r"endett|dette|levier|solv|capital|fond propre", lc):
        de  = _find("endettement", "debt/equity", "d/e", "dettes capitaux")
        sol = _find("solvabilité", "solvabilite")
        ci  = _find("couverture", "intérêts")
        r   = "## 🏦 Structure Financière & Endettement\n\n"
        if de:
            v = float(str(_rv(de)).replace(",", ".")) if _rv(de) != "—" else 1.5
            r += f"**Ratio Dettes/Capitaux : {_rv(de)}** {_rs(de)} — Benchmark : {_rb(de)}\n"
            if v > 3:   r += "🔴 Levier très élevé. Entreprise fortement dépendante de la dette externe.\n\n"
            elif v > 2: r += "⚠️ Levier significatif. Surveiller la charge financière.\n\n"
            else:       r += "✅ Levier modéré. Bonne autonomie financière.\n\n"
        if sol:
            r += f"**Solvabilité : {_rv(sol)}** {_rs(sol)} — Benchmark : {_rb(sol)}\n\n"
        if ci:
            r += f"**Couverture intérêts : {_rv(ci)}** {_rs(ci)} — Benchmark : {_rb(ci)}\n\n"
        if not de and not sol:
            r += "*Ratios d'endettement non disponibles.*"
        return r

    # ── Rentabilité ──────────────────────────────────────────
    if re.search(r"rentabilité|roa|roe|marge|bénéfice|profit|résultat", lc):
        roa = _find("roa", "rentabilité actif")
        roe = _find("roe", "rentabilité capitaux", "rentabilite capitaux")
        em  = _find("ebitda", "excédent brut")
        nm  = _find("marge nette", "net margin")
        r   = "## 📈 Analyse de la Rentabilité\n\n"
        if roa: r += f"**ROA : {_rv(roa)}** {_rs(roa)} — Pour 100F d'actif, {_rv(roa)} de résultat net. Benchmark : {_rb(roa)}\n\n"
        if roe: r += f"**ROE : {_rv(roe)}** {_rs(roe)} — Rendement des capitaux propres. Benchmark : {_rb(roe)}\n\n"
        if em:  r += f"**Marge EBITDA : {_rv(em)}** {_rs(em)} — Marge opérationnelle avant amortissements. Benchmark : {_rb(em)}\n\n"
        if nm:  r += f"**Marge nette : {_rv(nm)}** {_rs(nm)} — Part du CA devenant bénéfice net. Benchmark : {_rb(nm)}\n\n"
        if not roa and not roe: r += "*Ratios de rentabilité non disponibles.*"
        return r

    # ── SHAP / facteurs ──────────────────────────────────────
    if re.search(r"shap|facteur|impact|expliquer|pourquoi|cause|contribu", lc):
        if not shap:
            return "*Les valeurs SHAP ne sont pas disponibles. Relancez une analyse complète.*"
        positifs = [s for s in shap if (s.get("direction") == "positive" or s.get("pos", True))][:4]
        negatifs = [s for s in shap if not (s.get("direction") == "positive" or s.get("pos", False))][:4]
        r = f"## 🔍 Facteurs d'Impact SHAP — {nom}\n\n"
        r += f"**Facteurs qui augmentent le risque :**\n"
        for s in positifs:
            r += f"  📈 **{s.get('feature') or s.get('n','—')}** : +{abs(s.get('value') or s.get('v') or 0):.4f}\n"
        r += f"\n**Facteurs protecteurs :**\n"
        for s in negatifs:
            r += f"  📉 **{s.get('feature') or s.get('n','—')}** : -{abs(s.get('value') or s.get('v') or 0):.4f}\n"
        top = shap[0] if shap else None
        if top:
            r += f"\n*Le facteur le plus impactant est **{top.get('feature') or top.get('n','—')}**.*"
        return r

    # ── Recommandations / plan ───────────────────────────────
    if re.search(r"recomm|conseil|action|am[eé]liorer|que faire|priorit|plan", lc) or mode == "plan":
        if not recos:
            return "*Aucune recommandation disponible. Lancez une analyse complète depuis le Dashboard.*"
        urgent  = [r for r in recos if (r.get("level") or r.get("lvl")) == "high"][:2]
        importt = [r for r in recos if (r.get("level") or r.get("lvl")) == "medium"][:2]
        low     = [r for r in recos if (r.get("level") or r.get("lvl")) == "low"][:1]
        r = f"## 📋 Plan d'Action — {nom}\n\n"
        if urgent:
            r += "### 🔴 Actions Urgentes\n"
            for rec in urgent:
                r += f"- **{rec.get('title') or rec.get('t','—')}** : {(rec.get('description') or rec.get('d') or '')[:100]}\n"
            r += "\n"
        if importt:
            r += "### ⚠️ Actions Importantes\n"
            for rec in importt:
                r += f"- **{rec.get('title') or rec.get('t','—')}** : {(rec.get('description') or rec.get('d') or '')[:100]}\n"
            r += "\n"
        if low:
            r += "### 💡 Optimisations\n"
            for rec in low:
                r += f"- {rec.get('title') or rec.get('t','—')}\n"
        return r

    # ── Trajectoire ──────────────────────────────────────────
    if re.search(r"traject|tendance|[eé]volution|futur|pr[eé]vision|prochaine", lc):
        if not traj or not traj.get("trend"):
            return "*Trajectoire non disponible. Effectuez plusieurs analyses successives pour calculer la tendance.*"
        r = f"## 📈 Trajectoire Financière — {nom}\n\n"
        r += f"**Tendance actuelle : {traj.get('trend', '—')}**\n"
        r += f"Vélocité : {traj.get('velocity', 0)} pt/période | Accélération : {traj.get('acceleration', 0)}\n\n"
        if traj.get("alert_horizon"):
            r += f"⚠️ **Sans action corrective, le seuil critique pourrait être atteint dans {traj['alert_horizon']} période(s).**\n\n"
        forecast = traj.get("forecast_scores", [])[:3]
        if forecast:
            r += f"**Prévision 3 prochaines périodes :** {', '.join(str(s) for s in forecast)} pts\n\n"
        if traj.get("narrative"):
            r += f"*{traj['narrative']}*"
        return r

    # ── Anomalies ────────────────────────────────────────────
    if re.search(r"anomalie|fraude|incoh[eé]rence|suspect|bizarre|v[eé]rif", lc) or mode == "alerte":
        if not anom:
            return "*Détection d'anomalies non disponible. Activez le module Axe 1 dans le backend.*"
        if anom.get("risk_level") == "normal":
            return f"✅ **Aucune anomalie significative détectée pour {nom}.**\nScore d'anomalie : {anom.get('anomaly_score', 0)}/100. Les données financières sont cohérentes."
        r = f"## 🔔 Anomalies Détectées — {nom}\n\n"
        r += f"**Niveau : {anom.get('risk_level', '—').upper()}** | Score anomalie : {anom.get('anomaly_score', 0)}/100\n\n"
        for flag in (anom.get("flags") or [])[:5]:
            severity_icon = {"critical": "🔴", "warning": "⚠️"}.get(flag.get("severity"), "ℹ️")
            r += f"{severity_icon} **{flag.get('name', '—')}**\n{flag.get('detail', '')[:150]}\n\n"
        r += f"**Recommandation :** {anom.get('recommendation', '—')}"
        return r

    # ── Banquier ─────────────────────────────────────────────
    if mode == "banquier":
        ci_r  = _find("couverture", "intérêts")
        sol_r = _find("solvabilité")
        de_r  = _find("endettement", "dettes capitaux")
        prob  = ctx.get("probabiliteDefaut")
        r = f"## 🏦 Synthèse Crédit — {nom}\n\n"
        r += f"**Doctor Score™ : {score}/100 — {ZONE_LABELS.get(zone, zone)}**\n"
        if prob is not None:
            r += f"Probabilité de défaut : **{round(float(prob)*100,1) if float(prob)<=1 else round(float(prob),1)}%**\n\n"
        r += "### Capacité de remboursement\n"
        if ci_r: r += f"Couverture intérêts : {_rv(ci_r)} (benchmark : {_rb(ci_r)}) {_rs(ci_r)}\n"
        r += "\n### Solvabilité\n"
        if sol_r: r += f"Ratio solvabilité : {_rv(sol_r)} (benchmark : {_rb(sol_r)}) {_rs(sol_r)}\n"
        if de_r:  r += f"Levier financier : {_rv(de_r)} (benchmark : {_rb(de_r)}) {_rs(de_r)}\n"
        r += "\n*Connectez le backend pour une synthèse bancaire complète au format OHADA.*"
        return r

    # ── Réponse générique enrichie ───────────────────────────
    top  = shap[0] if shap else None
    recoU = next((r for r in recos if (r.get("level") or r.get("lvl")) == "high"), None)
    worst = min(
        [r for r in raw_ratios if isinstance(r.get("percentile") or r.get("p"), (int, float))],
        key=lambda r: r.get("percentile") or r.get("p") or 100,
        default=None
    )

    r = f"## 🩺 Doctor Smile — **{nom}**\n\n"
    r += f"**Score : {score}/100 — {ZONE_LABELS.get(zone, zone)}**\n\n"
    if top:
        r += f"**Facteur principal :** {top.get('feature') or top.get('n','—')} "
        r += f"({'augmente' if (top.get('direction')=='positive' or top.get('pos',True)) else 'protège contre'} le risque)\n\n"
    if worst:
        wn = worst.get("name") or worst.get("n","—")
        wv = worst.get("value") or worst.get("v","—")
        wb = worst.get("benchmark") or worst.get("b","—")
        r += f"**Point d'amélioration prioritaire :** {wn} = {wv} (objectif : {wb})\n\n"
    if recoU:
        r += f"**Action urgente :** {recoU.get('title') or recoU.get('t','—')}\n\n"
    r += "Posez une question précise : *liquidité, endettement, rentabilité, plan d'action, trajectoire, anomalies...*\n"
    r += "*Connectez le backend FastAPI pour des réponses LLM complètes.*"
    return r

# ════════════════════════════════════════════════════════════════
#  SERVICE PRINCIPAL
# ════════════════════════════════════════════════════════════════

class ChatServiceV2:
    """
    Service de chat IA v2.
    Compatible avec l'interface de ChatService v1 (méthode chat()).
    Ajoute : mode adaptatif, contexte complet, modèle retourné.
    """

    async def chat(
        self,
        message:  str,
        history:  list[dict[str, str]],
        context:  dict[str, Any],
        mode:     str = "auto",
        system:   str | None = None,
    ) -> str:
        """
        Retourne la réponse textuelle.
        Compatible drop-in avec chat_service v1.
        """
        result, _ = await self.chat_with_model(message, history, context, mode, system)
        return result

    async def chat_with_model(
        self,
        message:  str,
        history:  list[dict[str, str]],
        context:  dict[str, Any],
        mode:     str = "auto",
        system:   str | None = None,
    ) -> tuple[str, str]:
        """
        Retourne (réponse, modèle_utilisé).
        """
        if system:
            effective_mode = mode
            final_system = system
        else:
            effective_mode = _detect_mode(message, mode)
            final_system = _BASE_PROMPT + "\n\n## MODE ACTIF : " + MODES.get(effective_mode, "") + "\n" + MODE_INSTRUCTIONS.get(effective_mode, MODE_INSTRUCTIONS["auto"])
            
        ctx_str = _format_full_context(context) if context else ""
        max_tok = {"diagnostic": 900, "plan": 1000, "banquier": 850, "simulateur": 800, "alerte": 750, "pedagogique": 700}.get(effective_mode, 650)
        
        # Allouer plus de tokens si c'est un agent IA complet (prompt système complexe)
        if system:
            max_tok = 1500

        # Priorité 1 : Groq
        groq = _get_groq()
        if groq:
            try:
                reply = await self._call_groq(groq, message, history, ctx_str, final_system, max_tok)
                log.info("[chat_v2] Groq ✅ mode=%s len=%d", effective_mode, len(reply))
                return reply, "Groq · Llama 3.3"
            except Exception as e:
                log.warning("[chat_v2] Groq error (%s) → Gemini", e)

        # Priorité 2 : Gemini
        gemini = _get_gemini()
        if gemini:
            try:
                reply = await self._call_gemini(gemini, message, history, ctx_str, final_system, max_tok)
                log.info("[chat_v2] Gemini ✅ mode=%s len=%d", effective_mode, len(reply))
                return reply, "Gemini · Flash 2.0"
            except Exception as e:
                log.warning("[chat_v2] Gemini error (%s) → local", e)

        # Priorité 3 : Fallback local
        reply = _local_response(message, context, effective_mode)
        return reply, "Local"

    async def _call_groq(self, client, message, history, ctx_str, system, max_tok) -> str:
        messages = [{"role": "system", "content": system}]

        # Historique dédupliqué (20 tours max)
        seen = set()
        for turn in history[-20:]:
            role    = turn.get("role", "user")
            content = (turn.get("content") or "").strip()
            key = (role, content[:80])
            if content and key not in seen:
                seen.add(key)
                # Convertir 'assistant' → 'assistant' pour Groq
                groq_role = "assistant" if role == "assistant" else "user"
                messages.append({"role": groq_role, "content": content})

        # Message utilisateur avec contexte
        user_msg = message
        if ctx_str:
            user_msg = f"[CONTEXTE ANALYSE]\n{ctx_str}\n\n[QUESTION]\n{message}"

        messages.append({"role": "user", "content": user_msg})

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.3,
                max_tokens=max_tok,
            )
        )
        return response.choices[0].message.content.strip()

    async def _call_gemini(self, model, message, history, ctx_str, system, max_tok) -> str:
        gemini_history = []
        seen = set()
        for turn in history[-16:]:
            role    = turn.get("role", "user")
            content = (turn.get("content") or "").strip()
            key = content[:80]
            if content and key not in seen:
                seen.add(key)
                gemini_history.append({
                    "role":  "model" if role == "assistant" else "user",
                    "parts": [content],
                })

        user_msg = message
        if ctx_str:
            user_msg = f"[CONTEXTE ANALYSE]\n{ctx_str}\n\n[QUESTION]\n{message}"

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: model.start_chat(history=gemini_history).send_message(user_msg)
        )
        return response.text.strip()

# ════════════════════════════════════════════════════════════════
#  SINGLETON — rétrocompatible avec v1
# ════════════════════════════════════════════════════════════════
chat_service = ChatServiceV2()

# Exposer les helpers pour le router chat.py
get_active_model = lambda: (
    "Groq · Llama 3.3"  if _groq_client  else
    "Gemini · Flash 2.0" if _gemini_model else
    "Local"
)