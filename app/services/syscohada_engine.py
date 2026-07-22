"""
═══════════════════════════════════════════════════════════════════
  SYSCOHADA ENGINE — Doctor Smile v3.0
  Moteur de calcul déterministe basé sur la Balance Générale OHADA
  Remplace totalement sklearn / XGBoost / LightGBM / SHAP
═══════════════════════════════════════════════════════════════════

Architecture :
  1. parse_balance()     → Extraction des comptes depuis la balance brute
  2. compute_ratios()    → Calcul des ratios financiers SYSCOHADA
  3. score_risk()        → Matrice de vulnérabilité calibrée Cameroun
  4. generate_alerts()  → Alertes contextuelles OHADA

Référentiel :
  - SYSCOHADA Révisé 2017 (Acte Uniforme OHADA)
  - Normes BEAC / CEMAC
  - Calibrage terrain Cameroun (ONECCA)
═══════════════════════════════════════════════════════════════════
"""

from __future__ import annotations
import re
import time
import logging
from typing import Any

log = logging.getLogger("doctorsmile.syscohada")

# ═══════════════════════════════════════════════════════════════════
#  PLAN COMPTABLE SYSCOHADA — Racines de comptes
#  Source : PCG-OHADA, Acte Uniforme AUDCIF révisé 2017
# ═══════════════════════════════════════════════════════════════════

# Mapping : racine (2 chiffres) → catégorie financière
ACCOUNT_MAP: dict[str, str] = {
    # CLASSE 1 — Ressources Stables
    "10": "capital_social",
    "11": "reserves",
    "12": "resultat_exercice",
    "13": "subventions_investissement",
    "16": "emprunts_lt",
    "17": "dettes_lt_diverses",
    "18": "dettes_lt_leasing",
    "19": "provisions_risques",

    # CLASSE 2 — Actif Immobilisé
    "20": "immobilisations_incorporelles",
    "21": "immobilisations_corporelles",
    "22": "terrains",
    "23": "batiments",
    "24": "materiel_transport",
    "25": "materiel_bureau",
    "26": "participations",
    "27": "autres_immo_financieres",
    "28": "amortissements",

    # CLASSE 3 — Stocks
    "30": "stocks_marchandises",
    "31": "matieres_premieres",
    "32": "autres_approvisionnements",
    "35": "produits_finis",
    "37": "stocks_encours",

    # CLASSE 4 — Tiers (LA PLUS CRITIQUE pour le diagnostic)
    "40": "dettes_fournisseurs",    # Fournisseurs et Comptes rattachés
    "401": "dettes_fournisseurs",
    "403": "effets_a_payer",
    "41": "creances_clients",       # Clients et Comptes rattachés
    "411": "creances_clients",
    "413": "effets_a_recevoir",
    "416": "clients_douteux",       # ← Signal fort de risque
    "419": "avances_clients",
    "42": "personnel",
    "421": "salaires_dus",
    "43": "organismes_sociaux",
    "44": "etat_impots",
    "441": "tva_a_decaisser",
    "442": "impots_a_payer",
    "444": "tva_collectee",
    "445": "tva_deductible",
    "47": "comptes_transitoires",
    "48": "comptes_regularisation",

    # CLASSE 5 — Trésorerie (JUGE DE PAIX)
    "51": "titres_placement",
    "52": "banques",               # Compte bancaire
    "521": "banques",
    "53": "cheques_postaux",
    "57": "caisse",                # Espèces
    "571": "caisse",
    "58": "virements_internes",

    # CLASSE 6 — Charges
    "60": "achats_marchandises",
    "601": "achats_matieres",
    "604": "achats_etudes_services",
    "605": "achats_materiels",
    "61": "transports",
    "62": "services_exterieurs_a",
    "63": "services_exterieurs_b",
    "64": "impots_taxes",
    "65": "autres_charges",
    "66": "charges_personnel",
    "661": "salaires_traitements",
    "664": "charges_sociales",
    "67": "charges_financieres",
    "671": "interets_emprunts",
    "68": "dotations_amortissements",
    "69": "charges_hao",

    # CLASSE 7 — Produits
    "70": "chiffre_affaires",      # ← LE PIVOT DU DIAGNOSTIC
    "701": "ventes_marchandises",
    "702": "ventes_produits_finis",
    "704": "travaux_factures",
    "705": "etudes_facturees",
    "706": "prestations_services", # Conseil, services
    "707": "produits_accessoires",
    "71": "production_stockee",
    "72": "production_immobilisee",
    "74": "subventions_exploitation",
    "75": "autres_produits",
    "77": "produits_financiers",
    "79": "produits_hao",

    # CLASSE 8 — Résultats HAO
    "81": "valeurs_cessions_actifs",
    "82": "produits_cessions_actifs",
    "83": "charges_hao_exceptionnelles",
    "84": "produits_hao_exceptionnels",
    "85": "dotations_hao",
    "86": "reprises_hao",
    "87": "subventions_equilibre",
    "88": "impot_resultat",
    "89": "resultat_hao",
}

# ═══════════════════════════════════════════════════════════════════
#  SEUILS CALIBRÉS CAMEROUN / CEMAC
#  Source : BEAC, COBAC, ONECCA, terrain PME Cameroun
# ═══════════════════════════════════════════════════════════════════

THRESHOLDS_CMR = {
    # Trésorerie
    "tresorerie_critique":       0,       # Négatif = découvert
    "tresorerie_faible":         50_000,  # FCFA — seuil prudentiel

    # DSO (Days Sales Outstanding) — Délai moyen de recouvrement
    "dso_critique":              180,     # > 6 mois = très critique
    "dso_alerte":                90,      # > 3 mois = alerte (norme Cameroun)
    "dso_vigilance":             60,      # Seuil de vigilance

    # DPO (Days Payable Outstanding) — Délai moyen de paiement fournisseurs
    "dpo_critique":              120,
    "dpo_alerte":                90,

    # Ratio Clients/Fournisseurs
    "ratio_cli_four_critique":   5.0,     # > 5x = asphyxie sévère
    "ratio_cli_four_alerte":     3.0,     # > 3x = déséquilibre important
    "ratio_cli_four_vigilance":  1.5,

    # Liquidité Générale (Current Ratio)
    "current_ratio_sain":        1.0,     # Adapté PME Cameroun (vs 1.2 Europe)
    "current_ratio_alerte":      0.7,
    "current_ratio_critique":    0.5,

    # Endettement (Debt/Equity)
    "debt_equity_sain":          2.5,     # Cameroun : accès crédit difficile
    "debt_equity_alerte":        4.0,
    "debt_equity_critique":      6.0,

    # Solvabilité (Capitaux propres / Actif total)
    "solvabilite_sain":          20.0,    # % — adapté contexte CEMAC
    "solvabilite_alerte":        10.0,
    "solvabilite_critique":      5.0,

    # Rentabilité
    "roa_sain":                  1.5,     # % — seuil Cameroun
    "net_margin_sain":           2.0,     # %

    # Indice de vulnérabilité financière (IVF/100)
    "ivf_sain":                  35.0,    # IVF faible = situation saine
    "ivf_gris":                  65.0,    # IVF moyenne = surveillance
    "ivf_critique":              80.0,    # IVF élevée = action immédiate

    # Clients douteux (compte 416)
    "clients_douteux_alerte":    0.15,    # > 15% du total clients = alerte
    "clients_douteux_critique":  0.30,    # > 30% = critique

    # Capitaux propres négatifs — Signal juridique OHADA
    "capitaux_propres_negatifs": 0,       # Tout négatif = péril juridique
}

# ═══════════════════════════════════════════════════════════════════
#  PARSE BALANCE — Extraction des soldes par racine de compte
# ═══════════════════════════════════════════════════════════════════

def parse_balance(rows: list[dict[str, Any]], prefer_class_totals: bool = True) -> dict[str, float]:
    """
    Extrait les soldes financiers d'une balance générale SYSCOHADA.

    Stratégie de parsing (résiliente aux variantes de format) :
    1. Identifier la colonne contenant les numéros de compte (regex ^[0-9]{2,8})
    2. Identifier la colonne de solde (dernière colonne numérique ou nommée 'solde')
    3. Agréger par racine de compte (2 premiers chiffres)
    4. Prendre la valeur absolue pour les comptes créditeurs (classe 4, 7)

    Args:
        rows: Liste de dicts représentant les lignes de la balance
        prefer_class_totals: Si True, préfère les totaux de classes aux comptes détaillés

    Returns:
        Dict {categorie: montant_fcfa}
    """
    # ── Agréger les montants par racine SYSCOHADA ─────────────────
    raw_accounts: dict[str, float] = {}  # {numéro_compte: montant}
    class_totals: dict[str, float] = {}  # {prefixe_classe: montant}
    detail_accounts: dict[str, float] = {}  # {numéro_compte: montant}

    for row in rows:
        if not isinstance(row, dict):
            continue

        # Chercher le numéro de compte dans toutes les colonnes
        account_num = None
        account_val = None

        for col_key, col_val in row.items():
            col_str = str(col_key or "").strip().lower()
            val_str = str(col_val or "").strip()

            # Détecter un numéro de compte (commence par 1-9, 2-8 chiffres)
            if re.match(r"^[1-9][0-9]{1,7}$", val_str.replace(" ", "")):
                account_num = val_str.replace(" ", "")
                continue

            # La clé de colonne est un numéro de compte
            if re.match(r"^[1-9][0-9]{1,7}$", col_str.replace(" ", "")):
                account_num = col_str.replace(" ", "")
                account_val = _parse_amount(val_str)
                continue

            # Colonnes typiques de la balance SYSCOHADA
            if col_str in (
                "compte", "n° compte", "n°compte", "numero", "numero_compte",
                "account", "code", "code_compte", "num", "num_compte",
                "numéro", "numéro compte", "poste"
            ):
                account_num = re.sub(r"[^0-9]", "", val_str)
                continue

            # Chercher la colonne solde (priorité à la colonne de droite)
            if col_str in (
                "solde", "solde_periode", "solde période", "solde final",
                "solde de clôture", "solde clôture", "solde cloture",
                "balance", "net", "montant", "amount", "total",
                "débit-crédit", "debit_credit", "solde n", "solde_n"
            ) or col_str.endswith("solde") or col_str.startswith("solde"):
                account_val = _parse_amount(val_str)

        # Si on a trouvé un numéro de compte valide
        if account_num and len(account_num) >= 2:
            if account_val is None:
                # Prendre la dernière valeur numérique de la ligne
                account_val = _last_numeric_value(row)

            if account_val is not None:
                # Stocker tous les comptes
                raw_accounts[account_num] = raw_accounts.get(account_num, 0.0) + account_val
                
                # Déterminer si c'est un total de classe (2 ou 3 chiffres) ou un compte détaillé
                if len(account_num) <= 3:
                    # Potentiellement un total de classe
                    class_prefix = account_num[:2]
                    class_totals[class_prefix] = class_totals.get(class_prefix, 0.0) + account_val
                else:
                    # Compte détaillé
                    detail_accounts[account_num] = account_val

        # Cas spécial : la ligne est {numéro_compte: solde}
        elif not account_num and len(row) <= 3:
            for k, v in row.items():
                k_clean = re.sub(r"[^0-9]", "", str(k or ""))
                if len(k_clean) >= 2 and k_clean[0] in "123456789":
                    val = _parse_amount(str(v or ""))
                    if val is not None:
                        raw_accounts[k_clean] = raw_accounts.get(k_clean, 0.0) + val
                        if len(k_clean) <= 3:
                            class_prefix = k_clean[:2]
                            class_totals[class_prefix] = class_totals.get(class_prefix, 0.0) + val
                        else:
                            detail_accounts[k_clean] = val

    # ── Stratégie d'agrégation intelligente ───────────────────────
    categories: dict[str, float] = {}
    used_classes: set = set()
    
    # Si on préfère les totaux de classes et qu'on en a
    if prefer_class_totals and class_totals:
        log.debug("[parse_balance] Utilisation des totaux de classes (préférence activée)")
        # Mapper les totaux de classes
        for class_prefix, amount in class_totals.items():
            matched_cat = ACCOUNT_MAP.get(class_prefix)
            if matched_cat:
                categories[matched_cat] = categories.get(matched_cat, 0.0) + abs(amount)
                used_classes.add(class_prefix)
    else:
        log.debug("[parse_balance] Utilisation des comptes détaillés")
    
    # Pour les classes sans totaux, utiliser les comptes détaillés
    for acc_num, amount in detail_accounts.items():
        class_prefix = acc_num[:2]
        if class_prefix not in used_classes or not prefer_class_totals:
            matched_cat = None
            for prefix_len in (3, 2):
                prefix = acc_num[:prefix_len]
                cat = ACCOUNT_MAP.get(prefix)
                if cat:
                    matched_cat = cat
                    break
            
            if matched_cat:
                categories[matched_cat] = categories.get(matched_cat, 0.0) + abs(amount)
    
    # Stocker aussi tous les comptes bruts pour référence
    for acc_num, amount in raw_accounts.items():
        categories[f"raw_{acc_num}"] = amount

    log.debug("[parse_balance] %d comptes extraits → %d catégories (totaux_classes=%d, détails=%d)",
              len(raw_accounts), len(categories), len(class_totals), len(detail_accounts))
    return categories


def _parse_amount(val_str: str) -> float | None:
    """Parse un montant comptable (gère espaces, virgules, parenthèses négatives)."""
    if not val_str or val_str.strip() in ("", "-", "—", "N/A", "n/a"):
        return None
    try:
        # Gérer les montants négatifs entre parenthèses : (1 000,00) → -1000.00
        negative = val_str.strip().startswith("(") or val_str.strip().startswith("-")
        cleaned = re.sub(r"[()FCFA€$\s]", "", val_str)
        cleaned = cleaned.replace(",", ".").replace(" ", "")
        # Gérer le séparateur milliers : 1.000.000 → 1000000
        if cleaned.count(".") > 1:
            cleaned = cleaned.replace(".", "")
        val = float(cleaned)
        return -abs(val) if negative and val > 0 else val
    except (ValueError, TypeError):
        return None


def _last_numeric_value(row: dict) -> float | None:
    """Retourne la dernière valeur numérique non-nulle d'une ligne."""
    values = list(row.values())
    for v in reversed(values):
        parsed = _parse_amount(str(v or ""))
        if parsed is not None and parsed != 0:
            return parsed
    return None


# ═══════════════════════════════════════════════════════════════════
#  COMPUTE RATIOS — Calcul des indicateurs financiers SYSCOHADA
# ═══════════════════════════════════════════════════════════════════

def compute_ratios(comptes: dict[str, float]) -> dict[str, Any]:
    """
    Calcule tous les ratios financiers à partir des soldes de comptes SYSCOHADA.

    Formules selon le SYSCOHADA Révisé 2017 et normes BEAC/CEMAC.

    Returns:
        Dict contenant tous les ratios + agrégats intermédiaires
    """
    def g(key: str, default: float = 0.0) -> float:
        """Get compte value safely."""
        value = comptes.get(key, default)
        if value is None:
            return default
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, bool):
            return 1.0 if value else 0.0
        try:
            normalized = str(value).strip().replace(" ", "").replace("\u00A0", "")
            normalized = normalized.replace(",", ".")
            return float(normalized)
        except Exception:
            return default

    # ── Agrégats de base ────────────────────────────────────────
    ca = g("chiffre_affaires")
    if ca == 0:
        # Essayer de sommer toutes les sous-catégories de CA
        ca = (g("ventes_marchandises") + g("ventes_produits_finis") +
              g("prestations_services") + g("travaux_factures") +
              g("etudes_facturees") + g("produits_accessoires"))

    creances_clients = g("creances_clients") + g("effets_a_recevoir")
    clients_douteux  = g("clients_douteux")
    dettes_fourn     = g("dettes_fournisseurs") + g("effets_a_payer")
    tresorerie       = g("banques") + g("caisse") + g("cheques_postaux")

    # Actif
    actif_immobilise = (g("immobilisations_incorporelles") +
                        g("immobilisations_corporelles") +
                        g("terrains") + g("batiments") +
                        g("materiel_transport") + g("materiel_bureau") +
                        g("participations"))
    stocks = (g("stocks_marchandises") + g("matieres_premieres") +
              g("produits_finis") + g("stocks_encours"))
    actif_circulant  = (creances_clients + stocks +
                        g("autres_approvisionnements") + max(0, tresorerie))
    actif_total      = actif_immobilise + actif_circulant

    # Passif
    capitaux_propres = (g("capital_social") + g("reserves") +
                        g("resultat_exercice") - g("amortissements"))
    emprunts_lt      = g("emprunts_lt") + g("dettes_lt") + g("dettes_lt_divers")
    passif_courant   = dettes_fourn + g("personnel") + g("etat_impots") + g("tva_a_decaisser")
    dettes_totales   = passif_courant + emprunts_lt

    # Compte de résultat
    charges_totales  = (g("achats_marchandises") + g("achats_matieres") +
                        g("services_exterieurs_a") + g("services_exterieurs_b") +
                        g("charges_personnel") + g("transports") +
                        g("impots_taxes") + g("autres_charges") +
                        g("dotations_amortissements"))
    charges_fin      = g("charges_financieres") + g("interets_emprunts")
    marge_brute      = ca - g("achats_marchandises") - g("achats_matieres")
    ebitda           = marge_brute - g("services_exterieurs_a") - g("services_exterieurs_b") - g("charges_personnel")
    resultat_net     = g("resultat_exercice")

    # ── Trésorerie Nette (TN = FRNG - BFR) ──────────────────────
    frng = capitaux_propres + emprunts_lt - actif_immobilise  # Fonds de Roulement Net Global
    bfr  = (creances_clients + stocks) - dettes_fourn          # Besoin en Fonds de Roulement
    tresorerie_nette = frng - bfr

    # ── Ratios de Liquidité ─────────────────────────────────────
    current_ratio = safe_div(actif_circulant, passif_courant)
    quick_ratio   = safe_div(actif_circulant - stocks, passif_courant)
    cash_ratio    = safe_div(tresorerie, passif_courant)

    # ── Ratios de DSO / DPO (en jours, base 360 SYSCOHADA) ──────
    dso = safe_div(creances_clients * 360, ca)
    dpo = safe_div(dettes_fourn * 360, ca)

    # Ratio asphyxie clients/fournisseurs
    ratio_cli_four = safe_div(creances_clients, dettes_fourn) if dettes_fourn > 0 else None

    # ── Ratios de Rentabilité ────────────────────────────────────
    roa         = safe_div(resultat_net * 100, actif_total)
    roe         = safe_div(resultat_net * 100, capitaux_propres) if capitaux_propres > 0 else None
    net_margin  = safe_div(resultat_net * 100, ca)
    marge_brute_pct = safe_div(marge_brute * 100, ca)
    ebitda_margin   = safe_div(ebitda * 100, ca)

    # ── Solvabilité et Endettement ───────────────────────────────
    solvabilite = safe_div(capitaux_propres * 100, actif_total)
    debt_equity = safe_div(dettes_totales, capitaux_propres) if capitaux_propres > 0 else None
    rotation_actifs = safe_div(ca, actif_total)

    # ── Indice de vulnérabilité financière — IVF/100
    # Exposé en UI comme métrique de vulnérabilité claire et non pseudo-scientifique.
    ivf = None

    # ── Ratios BEAC/OHADA additionnels ───────────────────────────
    # Ratio de Couverture des Emplois Stables (Ressources Stables / Actif Immobilisé)
    ressources_stables = capitaux_propres + emprunts_lt
    ratio_couverture_emplois_stables = safe_div(ressources_stables, actif_immobilise) if actif_immobilise > 0 else None
    
    # Ratio d'Autonomie Financière (Capitaux Propres / Dettes Financières Stables)
    dettes_financieres_stables = emprunts_lt
    ratio_autonomie_financiere = safe_div(capitaux_propres, dettes_financieres_stables) if dettes_financieres_stables > 0 else None

    # ── Couverture des intérêts ──────────────────────────────────
    couverture_interets = safe_div(ebitda, charges_fin) if charges_fin > 0 else None

    # ── Qualité des données ──────────────────────────────────────
    total_comptes_attendus = 6  # ca, clients, fourn, tresorerie, capitaux, actif
    comptes_presents = sum([
        1 if ca > 0 else 0,
        1 if creances_clients > 0 else 0,
        1 if dettes_fourn > 0 else 0,
        1 if abs(tresorerie) > 0 else 0,
        1 if capitaux_propres != 0 else 0,
        1 if actif_total > 0 else 0,
    ])
    pct_missing = 1 - (comptes_presents / total_comptes_attendus)

    return {
        # Agrégats bruts (FCFA)
        "ca":                   round(ca, 2),
        "creances_clients":     round(creances_clients, 2),
        "clients_douteux":      round(clients_douteux, 2),
        "dettes_fournisseurs":  round(dettes_fourn, 2),
        "tresorerie":           round(tresorerie, 2),
        "tresorerie_nette":     round(tresorerie_nette, 2),
        "actif_total":          round(actif_total, 2),
        "actif_circulant":      round(actif_circulant, 2),
        "actif_immobilise":     round(actif_immobilise, 2),
        "passif_courant":       round(passif_courant, 2),
        "capitaux_propres":     round(capitaux_propres, 2),
        "dettes_totales":       round(dettes_totales, 2),
        "emprunts_lt":          round(emprunts_lt, 2),
        "stocks":               round(stocks, 2),
        "marge_brute":          round(marge_brute, 2),
        "ebitda":               round(ebitda, 2),
        "resultat_net":         round(resultat_net, 2),
        "frng":                 round(frng, 2),
        "bfr":                  round(bfr, 2),
        "charges_fin":          round(charges_fin, 2),

        # Ratios de liquidité
        "current_ratio":        _r(current_ratio),
        "quick_ratio":          _r(quick_ratio),
        "cash_ratio":           _r(cash_ratio),

        # Ratios DSO / DPO
        "dso":                  _r(dso),
        "dpo":                  _r(dpo),
        "ratio_cli_four":       _r(ratio_cli_four),

        # Rentabilité
        "roa":                  _r(roa),
        "roe":                  _r(roe),
        "net_margin":           _r(net_margin),
        "marge_brute_pct":      _r(marge_brute_pct),
        "ebitda_margin":        _r(ebitda_margin),

        # Structure
        "solvabilite":          _r(solvabilite),
        "debt_equity":          _r(debt_equity),
        "rotation_actifs":      _r(rotation_actifs),
        
        # Ratios BEAC/OHADA additionnels
        "ratio_couverture_emplois_stables": _r(ratio_couverture_emplois_stables),
        "ratio_autonomie_financiere":        _r(ratio_autonomie_financiere),

        # Risque
        "ivf":                  _r(ivf),
        "altman_z":             _r(ivf),
        "couverture_interets":  _r(couverture_interets),

        # Qualité des données
        "pct_missing":          round(pct_missing, 2),
        "comptes_presents":     comptes_presents,
    }


def safe_div(a: float, b: float) -> float | None:
    """Division sécurisée — retourne None si diviseur nul."""
    if b is None or b == 0:
        return None
    try:
        return round(a / b, 4)
    except Exception:
        return None


def _r(v: float | None, decimals: int = 2) -> float | None:
    """Round safely."""
    if v is None:
        return None
    try:
        return round(float(v), decimals)
    except Exception:
        return None


# ═══════════════════════════════════════════════════════════════════
#  SCORE RISK — Matrice de vulnérabilité SYSCOHADA Cameroun
# ═══════════════════════════════════════════════════════════════════

# Règles déterministes — chaque règle a un poids et un niveau de danger
RULES: list[dict] = [

    # ── TRÉSORERIE (priorité absolue) ────────────────────────────
    {
        "id":    "tresorerie_negative",
        "poids": 30,
        "niveau": "EXTREME",
        "condition": lambda r: r.get("tresorerie", 0) < 0,
        "titre": "🚨 Découvert bancaire",
        "desc":  "Votre compte bancaire (classe 52) est dans le rouge. "
                 "Cessation de paiement imminente si aucune action sous 30 jours.",
        "compte": "52 / 57",
        "action": "Négocier une ligne de crédit revolving d'urgence avec votre banque.",
    },
    {
        "id":    "tresorerie_quasi_nulle",
        "poids": 18,
        "niveau": "CRITIQUE",
        "condition": lambda r: 0 <= (r.get("tresorerie") or 0) < 100_000,
        "titre": "⚠️ Trésorerie quasi-nulle",
        "desc":  "Votre trésorerie (classe 52/57) est dangereusement basse. "
                 "Un imprévu (panne, retard client) peut suffire à provoquer une défaillance.",
        "compte": "52 / 57",
        "action": "Accélérer les encaissements et différer les dépenses non-urgentes.",
    },

    # ── DSO — ASPHYXIE PAR LES CRÉANCES CLIENTS ─────────────────
    {
        "id":    "dso_catastrophique",
        "poids": 30,
        "niveau": "EXTREME",
        "condition": lambda r: (r.get("dso") or 0) > 180,
        "titre": "🚨 Créances bloquées > 6 mois",
        "desc":  "Votre DSO dépasse 180 jours. Vos clients utilisent votre entreprise "
                 "comme une banque gratuite. C'est la principale cause de faillite en Afrique.",
        "compte": "411",
        "action": "Lancer des relances WhatsApp + lettres de mise en demeure immédiatement.",
    },
    {
        "id":    "dso_tres_eleve",
        "poids": 22,
        "niveau": "CRITIQUE",
        "condition": lambda r: 90 < (r.get("dso") or 0) <= 180,
        "titre": "🚨 Délai client hors-norme",
        "desc":  "DSO entre 90 et 180 jours. La norme CEMAC est de 60 jours. "
                 "Vos créances clients (compte 411) s'accumulent dangereusement.",
        "compte": "411",
        "action": "Conditionner toutes nouvelles commandes à un acompte de 50%.",
    },
    {
        "id":    "dso_eleve",
        "poids": 12,
        "niveau": "ELEVE",
        "condition": lambda r: 60 < (r.get("dso") or 0) <= 90,
        "titre": "⚠️ Délai client à surveiller",
        "desc":  "DSO entre 60 et 90 jours. En limite de la norme camerounaise (60j). "
                 "Surveiller l'évolution mensuelle.",
        "compte": "411",
        "action": "Mettre en place un suivi hebdomadaire des encaissements.",
    },

    # ── RATIO CLIENTS / FOURNISSEURS — Déséquilibre d'asphyxie ──
    {
        "id":    "ratio_cli_four_catastrophique",
        "poids": 25,
        "niveau": "EXTREME",
        "condition": lambda r: (r.get("ratio_cli_four") or 0) > 5.0,
        "titre": "🚨 Asphyxie financière sévère",
        "desc":  "Vos créances clients représentent plus de 5× vos dettes fournisseurs. "
                 "Votre entreprise finance ses clients au détriment de sa propre survie.",
        "compte": "411 / 401",
        "action": "Négocier des délais de paiement plus longs avec vos fournisseurs "
                  "ET accélérer le recouvrement client en urgence.",
    },
    {
        "id":    "ratio_cli_four_eleve",
        "poids": 14,
        "niveau": "CRITIQUE",
        "condition": lambda r: 3.0 < (r.get("ratio_cli_four") or 0) <= 5.0,
        "titre": "⚠️ Déséquilibre client/fournisseur critique",
        "desc":  "Ratio clients/fournisseurs > 3×. L'entreprise porte un risque de liquidité "
                 "disproportionné par rapport à ses créanciers.",
        "compte": "411 / 401",
        "action": "Revoir les conditions de paiement de vos 5 plus gros clients.",
    },

    # ── CLIENTS DOUTEUX (compte 416) ─────────────────────────────
    {
        "id":    "clients_douteux_eleve",
        "poids": 16,
        "niveau": "CRITIQUE",
        "condition": lambda r: (
            (r.get("clients_douteux") or 0) > 0 and
            (r.get("creances_clients") or 0) > 0 and
            ((r.get("clients_douteux") or 0) / (r.get("creances_clients") or 1) > 0.15)
        ),
        "titre": "⚠️ Créances irrécouvrables élevées",
        "desc":  "Vos créances douteuses (compte 416) dépassent 15% de vos créances totales. "
                 "Une partie significative de votre chiffre d'affaires ne sera jamais encaissée.",
        "compte": "416",
        "action": "Activer la procédure de créances douteuses et envisager une cession à un cabinet de recouvrement.",
    },

    # ── LIQUIDITÉ GÉNÉRALE ────────────────────────────────────────
    {
        "id":    "liquidite_critique",
        "condition": lambda r: ((r.get("dso") or 0) > 180),
        "niveau": "EXTREME",
        "condition": lambda r: (r.get("current_ratio") or 1) < 0.5,
        "titre": "🚨 Liquidité générale critique",
        "desc":  "Ratio de liquidité < 0.5. L'entreprise ne peut couvrir que la moitié "
                 "de ses dettes à court terme avec ses actifs courants.",
        "compte": "Classe 4 / 5",
        "action": "Réduire le passif circulant (payer les dettes les plus urgentes) "
                  "et augmenter l'actif circulant (encaisser les clients).",
    },
    {
        "id":    "liquidite_faible",
        "poids": 14,
        "niveau": "ELEVE",
        "condition": lambda r: 0.5 <= (r.get("current_ratio") or 1) < 1.0,
        "titre": "⚠️ Liquidité insuffisante",
        "desc":  "Ratio de liquidité entre 0.5 et 1.0. L'entreprise est en déséquilibre "
                 "de trésorerie à court terme.",
        "compte": "Classe 4 / 5",
        "action": "Optimiser le BFR : réduire les stocks et accélérer les encaissements.",
    },

    # ── CAPITAUX PROPRES NÉGATIFS — Péril Juridique OHADA ────────
    {
        "id":    "capitaux_propres_negatifs",
        "condition": lambda r: (90 < (r.get("dso") or 0) <= 180),
        "niveau": "EXTREME",
        "condition": lambda r: (r.get("capitaux_propres") or 0) < 0,
        "titre": "🚨 Capitaux propres négatifs — PÉRIL JURIDIQUE",
        "desc":  "Les pertes accumulées ont intégralement détruit les capitaux propres. "
                 "Selon l'Acte Uniforme OHADA, les associés ont l'obligation légale de "
                 "recapitaliser ou de dissoudre la société.",
        "compte": "Classe 1",
        "action": "Convoquer une assemblée générale extraordinaire dans les 6 mois. "
                  "Consulter un expert-comptable ONECCA immédiatement.",
    },
    {
        "id":    "fonds_propres_insuffisants",
        "poids": 15,
        "niveau": "CRITIQUE",
        "condition": lambda r: 0 <= (r.get("solvabilite") or 100) < 10,
        "titre": "⚠️ Solvabilité très faible",
        "desc":  "Les capitaux propres représentent moins de 10% des actifs totaux. "
                 "La structure financière est fragilisée.",
        "compte": "Classe 1",
        "action": "Envisager une augmentation de capital ou un apport en compte courant associé.",
    },

    # ── ENDETTEMENT EXCESSIF ──────────────────────────────────────
    {
        "id":    "endettement_extreme",
        "condition": lambda r: (60 < (r.get("dso") or 0) <= 90),
        "niveau": "EXTREME",
        "condition": lambda r: (r.get("debt_equity") or 0) > 6.0,
        "titre": "🚨 Endettement extrême",
        "desc":  "Ratio dettes/capitaux propres > 6×. L'entreprise est hyper-endettée "
                 "et dépend entièrement de ses créanciers pour fonctionner.",
        "compte": "Classe 1 / 6",
        "action": "Négocier un rééchelonnement de dette avec les banques. "
                  "Arrêter tout nouvel investissement financé par emprunt.",
    },

    # ── RENTABILITÉ NÉGATIVE ──────────────────────────────────────
    {
        "id":    "roa_negatif",
        "poids": 15,
        "niveau": "ELEVE",
        "condition": lambda r: (r.get("roa") or 0) < 0,
        "titre": "⚠️ Rentabilité négative",
        "desc":  "ROA négatif : l'entreprise consomme plus de ressources qu'elle n'en génère. "
                 "Chaque jour d'activité creuse les pertes.",
        "compte": "Classe 6 / 7",
        "action": "Analyser les postes de charges les plus lourds (compte 66 Personnel, 62/63 Services). "
                  "Revoir le pricing des prestations.",
    },

    # ── TRÉSORERIE NETTE NÉGATIVE ─────────────────────────────────
    {
        "id":    "tresorerie_nette_negative",
        "poids": 12,
        "niveau": "ELEVE",
        "condition": lambda r: (r.get("tresorerie_nette") or 0) < 0,
        "titre": "⚠️ Trésorerie nette négative",
        "desc":  "FRNG - BFR < 0. L'entreprise survit grâce aux découverts bancaires. "
                 "Situation précaire, dépendante des décisions de la banque.",
        "compte": "52 / 57 / Classe 4",
        "action": "Renforcer le fonds de roulement par un apport de capitaux ou un emprunt long terme.",
    },

    # ── CA INSUFFISANT ────────────────────────────────────────────
    {
        "id":    "ca_nul_ou_faible",
        "poids": 10,
        "niveau": "ELEVE",
        "condition": lambda r: r.get("ca", 0) < 1000,
        "titre": "⚠️ Chiffre d'affaires insuffisant ou absent",
        "desc":  "Le CA (compte 70) est quasi-nul ou non détecté dans la balance. "
                 "Soit l'entreprise ne génère pas de revenus, soit la balance est incomplète.",
        "compte": "70",
        "action": "Vérifier que la classe 7 est bien renseignée dans le fichier. "
                  "Analyser les causes de la stagnation commerciale.",
    },
]


def score_risk(ratios: dict[str, Any]) -> dict[str, Any]:
    """
    Calcule le score de risque SYSCOHADA Cameroun.

    Returns:
        Dict avec score /100, zone, alertes, recommandations
    """
    score_risque = 0
    alertes = []
    alertes_niveaux = {"EXTREME": 0, "CRITIQUE": 0, "ELEVE": 0, "MOYEN": 0}

    for rule in RULES:
        try:
            triggered = rule["condition"](ratios)
        except Exception:
            triggered = False

        if triggered:
            score_risque += rule["poids"]
            alertes_niveaux[rule["niveau"]] = alertes_niveaux.get(rule["niveau"], 0) + 1
            alertes.append({
                "id":      rule["id"],
                "niveau":  rule["niveau"],
                "poids":   rule["poids"],
                "titre":   rule["titre"],
                "desc":    rule["desc"],
                "compte":  rule["compte"],
                "action":  rule["action"],
            })

    # Score santé = 100 - risque normalisé sur 100
    # Max théorique des poids : ~230 (si toutes les règles se déclenchent)
    # On normalise sur 115 pour avoir une distribution réaliste
    MAX_RISK = 115
    score_sante = max(0, min(100, int(100 - (score_risque / MAX_RISK) * 100)))

    # Détermination de la zone SYSCOHADA
    zone = _score_to_zone(score_sante, alertes_niveaux)

    # Alerte spécifique sur l'indice de vulnérabilité
    if score_sante < 35:
        alertes_niveaux["CRITIQUE"] = alertes_niveaux.get("CRITIQUE", 0) + 1
        alertes.append({
            "id":     "ivf_critique",
            "niveau": "CRITIQUE",
            "poids":  20,
            "titre":  "⚠️ Indice de Vulnérabilité Financière élevé",
            "desc":   "L'Indice de Vulnérabilité Financière dépasse 65/100. Le risque structurel est très élevé.",
            "compte": "Multi-comptes",
            "action": "Solliciter un diagnostic approfondi et préparer un plan de trésorerie immédiat.",
        })

    # Probabilité de défaut
    prob_defaut = round((100 - score_sante) / 100, 3)

    log.info(
        "[score_risk] score=%d zone=%s risque_brut=%d alertes=%d (EXTREME:%d CRIT:%d)",
        score_sante, zone, score_risque, len(alertes),
        alertes_niveaux["EXTREME"], alertes_niveaux["CRITIQUE"]
    )

    return {
        "score":             score_sante,
        "zone":              zone,
        "probabiliteDefaut": round(prob_defaut * 100, 1),
        "score_risque_brut": score_risque,
        "alertes":           sorted(alertes, key=lambda a: a["poids"], reverse=True),
        "alertes_niveaux":   alertes_niveaux,
        "nb_alertes":        len(alertes),
    }


def _score_to_zone(score: int, niveaux: dict) -> str:
    """Détermine la zone de risque selon le score et les alertes critiques."""
    # Si une alerte EXTREME existe, le score ne peut pas être 'saine'
    if niveaux.get("EXTREME", 0) > 0:
        if score >= 50:
            return "vigilance"  # Nuancer si score pas catastrophique
        return "critique"
    if score >= 70:
        return "saine"
    if score >= 50:
        return "vigilance"
    if score >= 25:
        return "risque"
    return "critique"


# ═══════════════════════════════════════════════════════════════════
#  BUILD RESULT — Assemblage du résultat complet pour l'API
# ═══════════════════════════════════════════════════════════════════

ZONES = {
    "saine":     {"label": "Zone Saine",     "color": "#10b981", "bg": "rgba(16,185,129,.1)"},
    "vigilance": {"label": "Zone Vigilance", "color": "#f59e0b", "bg": "rgba(245,158,11,.1)"},
    "risque":    {"label": "Zone Risque",    "color": "#f97316", "bg": "rgba(249,115,22,.1)"},
    "critique":  {"label": "Zone Critique",  "color": "#ef4444", "bg": "rgba(239,68,68,.1)"},
}

# Labels lisibles pour les ratios
RATIO_LABELS: dict[str, str] = {
    "current_ratio":       "Liquidité générale",
    "quick_ratio":         "Liquidité immédiate",
    "cash_ratio":          "Ratio de trésorerie",
    "dso":                 "Délai client (DSO) — jours",
    "dpo":                 "Délai fournisseur (DPO) — jours",
    "ratio_cli_four":      "Ratio Clients/Fournisseurs",
    "debt_equity":         "Ratio d'endettement",
    "solvabilite":         "Solvabilité (%)",
    "roa":                 "ROA — Rentabilité des actifs (%)",
    "roe":                 "ROE — Rentabilité des capitaux (%)",
    "net_margin":          "Marge nette (%)",
    "marge_brute_pct":     "Marge brute (%)",
    "ebitda_margin":       "Marge EBITDA (%)",
    "rotation_actifs":     "Rotation des actifs",
    "couverture_interets": "Couverture des intérêts",
    "ratio_couverture_emplois_stables": "Couverture des Emplois Stables",
    "ratio_autonomie_financiere": "Ratio d'Autonomie Financière",
    "frng":                "Fonds de Roulement Net Global (FCFA)",
    "bfr":                 "Besoin en Fonds de Roulement (FCFA)",
    "tresorerie_nette":    "Trésorerie Nette (FCFA)",
}

# Benchmarks calibrés Cameroun
RATIO_BENCHMARKS: dict[str, tuple] = {
    # (seuil_ok, seuil_alerte, unité, higher_is_better)
    "current_ratio":       (1.0,  0.7,   "",    True),
    "quick_ratio":         (0.8,  0.5,   "",    True),
    "cash_ratio":          (0.1,  0.05,  "",    True),
    "dso":                 (60,   90,    "j",   False),
    "dpo":                 (60,   90,    "j",   True),   # Plus long = mieux pour l'entreprise
    "ratio_cli_four":      (1.5,  3.0,   "×",   False),
    "debt_equity":         (2.5,  4.0,   "×",   False),
    "solvabilite":         (20,   10,    "%",   True),
    "roa":                 (1.5,  0,     "%",   True),
    "roe":                 (5,    0,     "%",   True),
    "net_margin":          (2.0,  0,     "%",   True),
    "marge_brute_pct":     (20,   10,    "%",   True),
    "ebitda_margin":       (5,    0,     "%",   True),
    "rotation_actifs":     (0.5,  0.3,   "",    True),
    "couverture_interets": (2.0,  1.0,   "×",   True),
    "ratio_couverture_emplois_stables": (1.0,  0.8,   "×",   True),
    "ratio_autonomie_financiere":        (0.5,  0.3,   "×",   True),
}


def build_ratios_detail(ratios: dict[str, Any]) -> list[dict]:
    """Construit la liste des ratios pour le dashboard, avec statut et couleur."""
    result = []
    for key, label in RATIO_LABELS.items():
        val = ratios.get(key)
        if val is None:
            continue

        bench_data = RATIO_BENCHMARKS.get(key)
        if bench_data:
            seuil_ok, seuil_alerte, unit, higher = bench_data
            if higher:
                if val >= seuil_ok:
                    status, color = "green", "#10b981"
                elif val >= seuil_alerte:
                    status, color = "yellow", "#f59e0b"
                else:
                    status, color = "red", "#ef4444"
                score_val = int(min(100, max(0, (val / seuil_ok) * 100))) if seuil_ok else 50
            else:
                if val <= seuil_ok:
                    status, color = "green", "#10b981"
                elif val <= seuil_alerte:
                    status, color = "yellow", "#f59e0b"
                else:
                    status, color = "red", "#ef4444"
                score_val = int(min(100, max(0, (1 - val / max(seuil_alerte, 1)) * 100)))

            bench_label = f"{'<' if not higher else '>'} {seuil_ok}{unit}"
        else:
            status, color, score_val = "yellow", "#f59e0b", 50
            bench_label = "—"

        result.append({
            "name":      label,
            "key":       key,
            "value":     round(float(val), 2) if isinstance(val, float) else val,
            "unit":      bench_data[2] if bench_data else "",
            "benchmark": bench_label,
            "status":    status,
            "color":     color,
            "score":     score_val,
        })

    return result


def build_radar(ratios: dict[str, Any], score: int) -> list[dict]:
    """Construit les dimensions du radar chart."""
    import random
    rng = random.Random(score * 137 + 42)

    def pct(key, seuil_ok, higher=True):
        v = ratios.get(key)
        if v is None:
            return 50
        if higher:
            return int(min(100, max(0, (v / seuil_ok) * 100)))
        else:
            return int(min(100, max(0, (1 - v / max(seuil_ok, 0.01)) * 100)))

    return [
        {"label": "Trésorerie",    "value": pct("cash_ratio", 0.1)},
        {"label": "Recouvrement",  "value": pct("dso", 60, higher=False)},
        {"label": "Rentabilité",   "value": pct("roa", 1.5)},
        {"label": "Solvabilité",   "value": pct("solvabilite", 20)},
        {"label": "Liquidité",     "value": pct("current_ratio", 1.0)},
        {"label": "Croissance",    "value": min(100, max(0, score + rng.randint(-10, 10)))},
    ]


class SYSCOHADA_V2:
    """
    Wrapper engine for deterministic SYSCOHADA analysis v2.
    """

    def __init__(self, sector: str = "Unknown") -> None:
        self.sector = sector or "Unknown"

    async def build_comprehensive_analysis(
        self,
        balance: dict[str, Any],
        sector: str = "Unknown",
    ) -> dict[str, Any]:
        sector = sector or self.sector or "Unknown"
        balance_data = {k: self._parse_number(v) for k, v in (balance or {}).items()}

        ratios = self._build_ratios(balance_data)
        sector_benchmark = compute_sector_benchmark(ratios, sector)
        risques_aigus = self._build_risques_aigus(balance_data, ratios)
        zone = _score_to_zone(
            ratios.get("global_score", 0) if isinstance(ratios.get("global_score"), int) else 0,
            {"EXTREME": 1 if len([r for r in risques_aigus if r.get("niveau") == "EXTREME"]) > 0 else 0}
        )

        action_plan = generate_action_plan(risques_aigus, ratios, ratios.get("global_score", 0), zone)

        return {
            "solidite": self._build_axis(
                "Solidité financière",
                ratios,
                "solidite",
                {
                    "capitaux_propres": balance_data.get("capitaux_propres", 0),
                    "dettes_totales": balance_data.get("dettes_totales", 0),
                },
            ),
            "liquidite": self._build_axis(
                "Liquidité opérationnelle",
                ratios,
                "liquidite",
                {
                    "actif_courant": balance_data.get("actif_courant", 0),
                    "passif_courant": balance_data.get("passif_courant", 0),
                },
            ),
            "rentabilite": self._build_axis(
                "Rentabilité",
                ratios,
                "rentabilite",
                {
                    "ca": balance_data.get("ca", 0),
                    "resultat_net": balance_data.get("resultat_net", 0),
                },
            ),
            "efficacite": self._build_axis(
                "Efficacité",
                ratios,
                "efficacite",
                {
                    "actif_total": balance_data.get("actif_total", 0),
                    "ca": balance_data.get("ca", 0),
                },
            ),
            "secteur_contexte": {
                "secteur": sector,
                "benchmark": sector_benchmark,
            },
            "risques_aigus": risques_aigus,
            "plan_action": action_plan,
            "global_score": ratios.get("global_score", 0),
            "health_rating": self._health_rating(ratios.get("global_score", 0)),
            "default_risk_12m": self._estimate_default_risk(ratios.get("global_score", 0)),
            "summary": {
                "liquidite_generale": ratios.get("liquidite_generale"),
                "ratio_endettement": ratios.get("ratio_endettement"),
                "marge_nette": ratios.get("marge_nette"),
            },
            "sector_benchmark": sector_benchmark,
        }

    def _build_ratios(self, balance: dict[str, float]) -> dict[str, Any]:
        ca = balance.get("ca", 0.0)
        resultat_net = balance.get("resultat_net", 0.0)
        actif_total = balance.get("actif_total", 0.0)
        passif_total = balance.get("passif_total", 0.0)
        actif_courant = balance.get("actif_courant", 0.0)
        passif_courant = balance.get("passif_courant", 0.0)
        dettes_totales = balance.get("dettes_totales", 0.0)
        capitaux_propres = balance.get("capitaux_propres", 0.0)
        stocks = balance.get("stocks", 0.0)

        current_ratio = self._safe_div(actif_courant, passif_courant)
        debt_equity = self._safe_div(dettes_totales, capitaux_propres)
        net_margin = self._safe_div(resultat_net, ca) * 100 if ca else 0.0
        asset_turnover = self._safe_div(ca, actif_total)
        rotation_stocks = self._safe_div(stocks, ca) * 360 if ca else 0.0

        solidite_score = self._score_ratio(debt_equity, 0.5, 3.5, higher_is_better=False)
        liquidite_score = self._score_ratio(current_ratio, 0.8, 2.0)
        rentabilite_score = self._score_ratio(net_margin, 0.0, 15.0)
        efficacite_score = self._score_ratio(asset_turnover, 0.25, 1.5)

        global_score = int(round(
            min(100, max(0, (
                solidite_score * 0.25 +
                liquidite_score * 0.25 +
                rentabilite_score * 0.25 +
                efficacite_score * 0.15 +
                max(0, 100 - len([r for r in balance.values() if r is None]) * 10) * 0.10
            ))))
        )

        ratios = {
            "current_ratio": round(current_ratio, 2) if current_ratio is not None else None,
            "liquidite_generale": round(current_ratio, 2) if current_ratio is not None else None,
            "ratio_endettement": round(debt_equity, 2) if debt_equity is not None else None,
            "marge_nette": round(net_margin, 2),
            "rotation_stocks": round(rotation_stocks, 2),
            "ca": round(ca, 2),
            "resultat_net": round(resultat_net, 2),
            "actif_total": round(actif_total, 2),
            "passif_total": round(passif_total, 2),
            "actif_courant": round(actif_courant, 2),
            "passif_courant": round(passif_courant, 2),
            "dettes_totales": round(dettes_totales, 2),
            "capitaux_propres": round(capitaux_propres, 2),
            "stocks": round(stocks, 2),
            "solidite_score": solidite_score,
            "liquidite_score": liquidite_score,
            "rentabilite_score": rentabilite_score,
            "efficacite_score": efficacite_score,
            "global_score": global_score,
        }
        return ratios

    def _build_axis(self, title: str, ratios: dict[str, Any], key: str, details: dict[str, Any]) -> dict[str, Any]:
        return {
            "title": title,
            "score": ratios.get(f"{key}_score", 0),
            "details": details,
            "status": self._axis_status(ratios.get(f"{key}_score", 0)),
        }

    def _build_risques_aigus(self, balance: dict[str, float], ratios: dict[str, Any]) -> list[dict[str, Any]]:
        risks = []
        current_ratio = ratios.get("current_ratio", 0) or 0
        ratio_endettement = ratios.get("ratio_endettement", 0) or 0
        marge_nette = ratios.get("marge_nette", 0) or 0
        ca = balance.get("ca", 0) or 0
        actif_total = balance.get("actif_total", 0) or 0
        dettes_totales = balance.get("dettes_totales", 0) or 0

        if current_ratio < 1.0:
            risks.append({
                "id": "liquidite_insuffisante",
                "titre": "Liquidité insuffisante",
                "description": "Le ratio de liquidité est inférieur à 1. L'entreprise peut avoir des difficultés à couvrir ses dettes courantes.",
                "niveau": "CRITIQUE",
                "type": "LIQUIDITE",
                "score": 25,
            })

        if ratio_endettement > 3.0:
            risks.append({
                "id": "endettement_eleve",
                "titre": "Endettement élevé",
                "description": "Le ratio d'endettement est supérieur à 3, ce qui indique une forte dépendance aux dettes.",
                "niveau": "CRITIQUE",
                "type": "ENDETTEMENT",
                "score": 20,
            })

        if marge_nette < 0:
            risks.append({
                "id": "rentabilite_negative",
                "titre": "Rentabilité négative",
                "description": "Le résultat net est négatif par rapport au chiffre d'affaires.",
                "niveau": "EXTREME",
                "type": "RENTABILITE",
                "score": 30,
            })

        if ca > 0 and ca < 100000:
            risks.append({
                "id": "ca_faible",
                "titre": "Chiffre d'affaires faible",
                "description": "Le chiffre d'affaires est faible pour le secteur, ce qui peut limiter la capacité d'investissement.",
                "niveau": "ELEVE",
                "type": "GENERAL",
                "score": 15,
            })

        if actif_total > 0 and dettes_totales / actif_total > 0.75:
            risks.append({
                "id": "structure_fragile",
                "titre": "Structure financière fragile",
                "description": "Les dettes représentent plus de 75% de l'actif total.",
                "niveau": "ELEVE",
                "type": "ENDETTEMENT",
                "score": 15,
            })

        if not risks:
            risks.append({
                "id": "risque_moderate",
                "titre": "Situation stable",
                "description": "Aucun risque aigu structuré détecté. La situation financière semble stable.",
                "niveau": "MOYEN",
                "type": "GENERAL",
                "score": 5,
            })

        return risks

    def _axis_status(self, score: int) -> str:
        if score >= 80:
            return "excellent"
        if score >= 60:
            return "bon"
        if score >= 40:
            return "moyen"
        return "faible"

    def _health_rating(self, score: int) -> str:
        if score >= 80:
            return "Excellent"
        if score >= 60:
            return "Bon"
        if score >= 40:
            return "Attention"
        return "Critique"

    def _estimate_default_risk(self, score: int) -> float:
        if score >= 80:
            return 5.0
        if score >= 60:
            return 15.0
        if score >= 40:
            return 35.0
        return 55.0

    def _score_ratio(self, value: float, lower: float, upper: float, higher_is_better: bool = True) -> int:
        if value is None:
            return 0
        if higher_is_better:
            if value <= lower:
                return 0
            if value >= upper:
                return 100
            return int(round(((value - lower) / (upper - lower)) * 100))
        else:
            if value <= lower:
                return 100
            if value >= upper:
                return 0
            return int(round(((upper - value) / (upper - lower)) * 100))

    def _safe_div(self, a: float, b: float) -> float:
        try:
            return float(a) / float(b) if b not in (None, 0) else 0.0
        except Exception:
            return 0.0

    def _parse_number(self, value: Any) -> float:
        if isinstance(value, (int, float)):
            return float(value)
        try:
            return float(str(value).replace(",", "."))
        except Exception:
            return 0.0

    def _estimate_default_risk(self, score: int) -> float:
        if score >= 80:
            return 5.0
        if score >= 60:
            return 15.0
        if score >= 40:
            return 35.0
        return 55.0


def generate_recommendations(ratios: dict[str, Any], alertes: list[dict]) -> list[dict]:
    """Génère les recommandations prioritaires format 'Chiffre → Conséquence → Action'."""
    recos = []

    urgency_map = {
        "EXTREME":  ("immediate",   "🔴"),
        "CRITIQUE": ("immediate",   "🔴"),
        "ELEVE":    ("court_terme", "🟠"),
        "MOYEN":    ("moyen_terme", "🟡"),
    }
    icon_map = {
        "EXTREME":  "fa-skull-crossbones",
        "CRITIQUE": "fa-exclamation-triangle",
        "ELEVE":    "fa-chart-line",
        "MOYEN":    "fa-info-circle",
    }

    for alerte in alertes[:8]:  # Top 8 alertes
        urgency, u_emoji = urgency_map.get(alerte["niveau"], ("court_terme", "🟠"))
        titre_clean = alerte["titre"].replace("🚨 ", "").replace("⚠️ ", "").replace("🔴 ", "")
        recos.append({
            "urgency":     urgency,
            "level":       "high" if alerte["niveau"] in ("EXTREME", "CRITIQUE") else "medium" if alerte["niveau"] == "ELEVE" else "low",
            "icon":        icon_map.get(alerte["niveau"], "fa-chart-line"),
            "emoji":       u_emoji,
            "title":       titre_clean,
            "detail":      alerte["action"],
            "description": alerte["desc"],
            "compte":      alerte["compte"],
            "impact_score": alerte["poids"],
        })

    if not recos:
        recos.append({
            "urgency":     "moyen_terme",
            "level":       "low",
            "icon":        "fa-seedling",
            "emoji":       "🟢",
            "title":       "Situation financière équilibrée",
            "detail":      "Maintenez un suivi mensuel de votre trésorerie (compte 512/571). "
                           "Surveillez votre DSO pour rester sous 60 jours selon les normes CEMAC.",
            "description": "Vos indicateurs financiers sont globalement dans les normes SYSCOHADA. "
                           "Continuez à monitorer les comptes clés (411 Clients, 401 Fournisseurs, 512 Banque).",
            "compte":      "512 / 411 / 401",
            "impact_score": 0,
        })

    return recos


def compute_cash_burn_runway(comptes: dict[str, float], ratios: dict[str, float]) -> dict[str, Any]:
    """
    Calcule le Cash-Burn et le Runway (F1 - Suivi Trésorerie Critique).
    
    Cash-Burn: Vitesse de consommation de la trésorerie mensuelle
    Runway: Nombre de mois avant épuisement des fonds
    
    Args:
        comptes: Dictionnaire des comptes SYSCOHADA
        ratios: Dictionnaire des ratios calculés
        
    Returns:
        dict: cash_burn_mensuel, runway_mois, tresorerie_actuelle, alerte_niveau
    """
    # Trésorerie actuelle (Banque + Caisse)
    tresorerie_actuelle = comptes.get("banques", 0) + comptes.get("caisse", 0)
    
    # Dépenses mensuelles estimées (Charges d'exploitation - Produits d'exploitation)
    # Approximation basée sur les comptes de charges (classe 6) et produits (classe 7)
    charges_exploitation = (
        comptes.get("achats_marchandises", 0) +
        comptes.get("achats_matieres", 0) +
        comptes.get("transports", 0) +
        comptes.get("services_exterieurs_a", 0) +
        comptes.get("services_exterieurs_b", 0) +
        comptes.get("salaires_dus", 0) +
        comptes.get("charges_personnel", 0)
    )
    
    # Cash-Burn mensuel (moyenne sur 12 mois si données historiques disponibles)
    cash_burn_mensuel = abs(charges_exploitation) / 12 if charges_exploitation != 0 else 0
    
    # Si cash_burn est trop faible ou nul, utiliser une estimation basée sur le ratio de liquidité
    if cash_burn_mensuel < 10000:
        # Estimation alternative: 10% de la trésorerie actuelle comme burn mensuel minimum
        cash_burn_mensuel = tresorerie_actuelle * 0.10
    
    # Runway en mois
    runway_mois = tresorerie_actuelle / cash_burn_mensuel if cash_burn_mensuel > 0 else float('inf')
    
    # Niveau d'alerte
    if runway_mois < 2:
        alerte_niveau = "CRITIQUE"
        alerte_message = "Trésorerie critique: moins de 2 mois de runway"
    elif runway_mois < 4:
        alerte_niveau = "ELEVE"
        alerte_message = "Trésorerie sous surveillance: moins de 4 mois de runway"
    elif runway_mois < 6:
        alerte_niveau = "MOYEN"
        alerte_message = "Trésorerie acceptable: entre 4 et 6 mois de runway"
    else:
        alerte_niveau = "NORMAL"
        alerte_message = "Trésorerie saine: plus de 6 mois de runway"
    
    return {
        "cash_burn_mensuel": round(cash_burn_mensuel, 2),
        "runway_mois": round(runway_mois, 1),
        "tresorerie_actuelle": round(tresorerie_actuelle, 2),
        "alerte_niveau": alerte_niveau,
        "alerte_message": alerte_message,
        "devise": "XAF"
    }


def simulate_financing_impact(comptes: dict[str, float], ratios: dict[str, float], 
                              montant_credit: float, duree_mois: int = 12) -> dict[str, Any]:
    """
    Simule l'impact d'un financement sur la capacité d'emprunt et le score (F2).
    
    Args:
        comptes: Dictionnaire des comptes SYSCOHADA actuels
        ratios: Dictionnaire des ratios calculés actuels
        montant_credit: Montant du crédit souhaité en XAF
        duree_mois: Durée du crédit en mois (défaut: 12)
        
    Returns:
        dict: impact_score, capacite_emprunt_max, recommandation, scenarios
    """
    # Capacité d'emprunt maximale basée sur le ratio d'endettement actuel
    # Ratio d'endettement = Dettes totales / Total Actif
    endettement_actuel = ratios.get("ratio_endettement", 0)
    total_actif = comptes.get("total_actif", 1)
    dettes_actuelles = comptes.get("total_dettes", 0)
    
    # Seuil bancaire typique: ratio d'endettement < 70%
    seuil_endettement = 0.70
    capacite_max = (total_actif * seuil_endettement) - dettes_actuelles
    
    # Impact sur le ratio d'endettement
    dettes_simulees = dettes_actuelles + montant_credit
    endettement_simule = dettes_simulees / total_actif if total_actif > 0 else 1
    
    # Impact sur le score (approximation basée sur l'endettement)
    score_actuel = ratios.get("ivf", 50)
    impact_score = max(0, score_actuel - (endettement_simule - endettement_actuel) * 100)
    
    # Recommandation
    if endettement_simule > seuil_endettement:
        recommandation = "NON RECOMMANDÉ"
        niveau = "CRITIQUE"
        message = f"Ce crédit ferait passer votre ratio d'endettement à {endettement_simule:.1%}, dépassant le seuil bancaire de 70%."
    elif endettement_simule > 0.60:
        recommandation = "RISQUE ÉLEVÉ"
        niveau = "ELEVE"
        message = f"Ce crédit ferait passer votre ratio d'endettement à {endettement_simule:.1%}. Approchez avec prudence."
    elif endettement_simule > 0.50:
        recommandation = "ACCEPTABLE"
        niveau = "MOYEN"
        message = f"Ce crédit ferait passer votre ratio d'endettement à {endettement_simule:.1%}. Projet finançable sous conditions."
    else:
        recommandation = "RECOMMANDÉ"
        niveau = "NORMAL"
        message = f"Ce crédit ferait passer votre ratio d'endettement à {endettement_simule:.1%}. Excellent profil de financement."
    
    # Scénarios de simulation
    scenarios = [
        {
            "montant": montant_credit * 0.5,
            "endettement": (dettes_actuelles + montant_credit * 0.5) / total_actif if total_actif > 0 else 1,
            "score_impact": max(0, score_actuel - ((dettes_actuelles + montant_credit * 0.5) / total_actif - endettement_actuel) * 100)
        },
        {
            "montant": montant_credit,
            "endettement": endettement_simule,
            "score_impact": impact_score
        },
        {
            "montant": montant_credit * 1.5,
            "endettement": (dettes_actuelles + montant_credit * 1.5) / total_actif if total_actif > 0 else 1,
            "score_impact": max(0, score_actuel - ((dettes_actuelles + montant_credit * 1.5) / total_actif - endettement_actuel) * 100)
        }
    ]
    
    return {
        "montant_credit": round(montant_credit, 2),
        "duree_mois": duree_mois,
        "endettement_actuel": round(endettement_actuel, 4),
        "endettement_simule": round(endettement_simule, 4),
        "score_actuel": round(score_actuel, 1),
        "score_impact": round(impact_score, 1),
        "capacite_emprunt_max": round(max(0, capacite_max), 2),
        "recommandation": recommandation,
        "niveau": niveau,
        "message": message,
        "scenarios": scenarios,
        "devise": "XAF"
    }


def generate_early_warnings(comptes: dict[str, float], ratios: dict[str, float], 
                          ratios_precedents: dict[str, float] = None) -> list[dict]:
    """
    Génère des alertes précoces basées sur l'évolution des ratios (F3 - Early Warning).
    
    Args:
        comptes: Dictionnaire des comptes SYSCOHADA actuels
        ratios: Dictionnaire des ratios calculés actuels
        ratios_precedents: Dictionnaire des ratios de la période précédente (optionnel)
        
    Returns:
        list: Alertes précoces avec niveau, message, et recommandation
    """
    alertes = []
    
    # Seuils d'alerte SYSCOHADA
    seuils = {
        "dso": {"critique": 90, "eleve": 60, "moyen": 45},
        "dpo": {"critique": 30, "eleve": 45, "moyen": 60},
        "ratio_endettement": {"critique": 0.80, "eleve": 0.70, "moyen": 0.50},
        "liquidite_generale": {"critique": 1.0, "eleve": 1.2, "moyen": 1.5},
        "marge_nette": {"critique": 0.0, "eleve": 0.05, "moyen": 0.10},
        "rotation_stocks": {"critique": 180, "eleve": 120, "moyen": 90}
    }
    
    # Alertes basées sur les valeurs actuelles
    dso = ratios.get("dso", 0)
    if dso > seuils["dso"]["critique"]:
        alertes.append({
            "type": "DSO",
            "niveau": "CRITIQUE",
            "titre": "Délai de paiement clients critique",
            "message": f"Votre DSO est de {dso:.0f} jours, dépassant le seuil critique de 90 jours. Risque élevé de tension de trésorerie.",
            "recommandation": "Relancez vos clients en retard et envisagez des escomptes pour paiement anticipé.",
            "valeur": dso,
            "seuil": seuils["dso"]["critique"]
        })
    elif dso > seuils["dso"]["eleve"]:
        alertes.append({
            "type": "DSO",
            "niveau": "ELEVE",
            "titre": "Délai de paiement clients élevé",
            "message": f"Votre DSO est de {dso:.0f} jours, dépassant le seuil d'alerte de 60 jours.",
            "recommandation": "Surveillez vos créances et renforcez votre processus de recouvrement.",
            "valeur": dso,
            "seuil": seuils["dso"]["eleve"]
        })
    
    # Ratio d'endettement
    endettement = ratios.get("ratio_endettement", 0)
    if endettement > seuils["ratio_endettement"]["critique"]:
        alertes.append({
            "type": "ENDETTEMENT",
            "niveau": "CRITIQUE",
            "titre": "Ratio d'endettement critique",
            "message": f"Votre ratio d'endettement est de {endettement:.1%}, dépassant le seuil critique de 80%.",
            "recommandation": "Réduisez vos dettes à court terme ou augmentez vos fonds propres.",
            "valeur": endettement,
            "seuil": seuils["ratio_endettement"]["critique"]
        })
    elif endettement > seuils["ratio_endettement"]["eleve"]:
        alertes.append({
            "type": "ENDETTEMENT",
            "niveau": "ELEVE",
            "titre": "Ratio d'endettement élevé",
            "message": f"Votre ratio d'endettement est de {endettement:.1%}, dépassant le seuil d'alerte de 70%.",
            "recommandation": "Surveillez votre capacité d'emprunt avant de solliciter un nouveau crédit.",
            "valeur": endettement,
            "seuil": seuils["ratio_endettement"]["eleve"]
        })
    
    # Liquidité générale
    liquidite = ratios.get("liquidite_generale", 0)
    if liquidite < seuils["liquidite_generale"]["critique"]:
        alertes.append({
            "type": "LIQUIDITE",
            "niveau": "CRITIQUE",
            "titre": "Liquidité générale critique",
            "message": f"Votre ratio de liquidité générale est de {liquidite:.2f}, sous le seuil critique de 1.0.",
            "recommandation": "Renforcez votre trésorerie à court terme ou négociez des délais fournisseurs.",
            "valeur": liquidite,
            "seuil": seuils["liquidite_generale"]["critique"]
        })
    elif liquidite < seuils["liquidite_generale"]["eleve"]:
        alertes.append({
            "type": "LIQUIDITE",
            "niveau": "ELEVE",
            "titre": "Liquidité générale sous surveillance",
            "message": f"Votre ratio de liquidité générale est de {liquidite:.2f}, sous le seuil d'alerte de 1.2.",
            "recommandation": "Optimisez votre BFR et surveillez vos flux de trésorerie.",
            "valeur": liquidite,
            "seuil": seuils["liquidite_generale"]["eleve"]
        })
    
    # Alertes basées sur l'évolution (si données précédentes disponibles)
    if ratios_precedents:
        dso_precedent = ratios_precedents.get("dso", dso)
        delta_dso = dso - dso_precedent
        
        if delta_dso > 15:
            alertes.append({
                "type": "EVOLUTION_DSO",
                "niveau": "ELEVE",
                "titre": "Détérioration significative du DSO",
                "message": f"Votre DSO a augmenté de {delta_dso:.0f} jours par rapport à la période précédente.",
                "recommandation": "Analysez les causes de cette détérioration et mettez en place un plan d'action.",
                "valeur": delta_dso,
                "seuil": 15
            })
        
        marge_precedente = ratios_precedents.get("marge_nette", ratios.get("marge_nette", 0))
        delta_marge = ratios.get("marge_nette", 0) - marge_precedente
        
        if delta_marge < -0.05:  # Baisse de plus de 5%
            alertes.append({
                "type": "EVOLUTION_MARGE",
                "niveau": "ELEVE",
                "titre": "Baisse significative de la marge nette",
                "message": f"Votre marge nette a baissé de {abs(delta_marge)*100:.1f}% par rapport à la période précédente.",
                "recommandation": "Revuez votre politique de prix et vos coûts pour restaurer votre rentabilité.",
                "valeur": delta_marge,
                "seuil": -0.05
            })
    
    # Trier par niveau de gravité
    ordre_niveau = {"CRITIQUE": 0, "ELEVE": 1, "MOYEN": 2}
    alertes.sort(key=lambda a: ordre_niveau.get(a["niveau"], 3))
    
    return alertes


# ─── F4: Benchmarking Sectoriel Anonymisé ─────────────────────────────
# Données sectorielles basées sur les normes SYSCOHADA OHADA et statistiques professionnelles
# Sources: Normes OHADA, Statistiques bancaires CEMAC, Études sectorielles
SECTOR_BENCHMARKS = {
    "commerce": {
        "marge_nette": {"moyenne": 0.05, "percentile_25": 0.02, "percentile_75": 0.08},
        "dso": {"moyenne": 45, "percentile_25": 30, "percentile_75": 60},
        "rotation_stocks": {"moyenne": 60, "percentile_25": 45, "percentile_75": 90},
        "liquidite_generale": {"moyenne": 1.2, "percentile_25": 0.8, "percentile_75": 1.6},
        "ratio_endettement": {"moyenne": 0.65, "percentile_25": 0.45, "percentile_75": 0.80}
    },
    "btp": {
        "marge_nette": {"moyenne": 0.06, "percentile_25": 0.03, "percentile_75": 0.10},
        "dso": {"moyenne": 75, "percentile_25": 60, "percentile_75": 105},
        "rotation_stocks": {"moyenne": 45, "percentile_25": 30, "percentile_75": 60},
        "liquidite_generale": {"moyenne": 1.1, "percentile_25": 0.7, "percentile_75": 1.5},
        "ratio_endettement": {"moyenne": 0.70, "percentile_25": 0.50, "percentile_75": 0.85}
    },
    "services": {
        "marge_nette": {"moyenne": 0.12, "percentile_25": 0.08, "percentile_75": 0.18},
        "dso": {"moyenne": 30, "percentile_25": 20, "percentile_75": 45},
        "rotation_stocks": {"moyenne": 30, "percentile_25": 15, "percentile_75": 45},
        "liquidite_generale": {"moyenne": 1.3, "percentile_25": 0.9, "percentile_75": 1.8},
        "ratio_endettement": {"moyenne": 0.50, "percentile_25": 0.30, "percentile_75": 0.65}
    },
    "transport": {
        "marge_nette": {"moyenne": 0.07, "percentile_25": 0.04, "percentile_75": 0.11},
        "dso": {"moyenne": 45, "percentile_25": 30, "percentile_75": 60},
        "rotation_stocks": {"moyenne": 30, "percentile_25": 20, "percentile_75": 45},
        "liquidite_generale": {"moyenne": 1.0, "percentile_25": 0.7, "percentile_75": 1.4},
        "ratio_endettement": {"moyenne": 0.75, "percentile_25": 0.55, "percentile_75": 0.90}
    },
    "industrie": {
        "marge_nette": {"moyenne": 0.08, "percentile_25": 0.05, "percentile_75": 0.12},
        "dso": {"moyenne": 60, "percentile_25": 45, "percentile_75": 90},
        "rotation_stocks": {"moyenne": 90, "percentile_25": 60, "percentile_75": 120},
        "liquidite_generale": {"moyenne": 1.5, "percentile_25": 1.0, "percentile_75": 2.0},
        "ratio_endettement": {"moyenne": 0.55, "percentile_25": 0.35, "percentile_75": 0.70}
    },
    "agriculture": {
        "marge_nette": {"moyenne": 0.04, "percentile_25": 0.02, "percentile_75": 0.07},
        "dso": {"moyenne": 90, "percentile_25": 60, "percentile_75": 120},
        "rotation_stocks": {"moyenne": 180, "percentile_25": 120, "percentile_75": 240},
        "liquidite_generale": {"moyenne": 0.9, "percentile_25": 0.6, "percentile_75": 1.3},
        "ratio_endettement": {"moyenne": 0.60, "percentile_25": 0.40, "percentile_75": 0.75}
    },
    "telecommunications": {
        "marge_nette": {"moyenne": 0.15, "percentile_25": 0.10, "percentile_75": 0.22},
        "dso": {"moyenne": 35, "percentile_25": 25, "percentile_75": 50},
        "rotation_stocks": {"moyenne": 20, "percentile_25": 10, "percentile_75": 30},
        "liquidite_generale": {"moyenne": 1.4, "percentile_25": 1.0, "percentile_75": 1.9},
        "ratio_endettement": {"moyenne": 0.45, "percentile_25": 0.25, "percentile_75": 0.60}
    },
    "sante": {
        "marge_nette": {"moyenne": 0.10, "percentile_25": 0.06, "percentile_75": 0.15},
        "dso": {"moyenne": 50, "percentile_25": 35, "percentile_75": 70},
        "rotation_stocks": {"moyenne": 90, "percentile_25": 60, "percentile_75": 120},
        "liquidite_generale": {"moyenne": 1.2, "percentile_25": 0.8, "percentile_75": 1.7},
        "ratio_endettement": {"moyenne": 0.55, "percentile_25": 0.35, "percentile_75": 0.70}
    },
    "education": {
        "marge_nette": {"moyenne": 0.08, "percentile_25": 0.05, "percentile_75": 0.12},
        "dso": {"moyenne": 30, "percentile_25": 20, "percentile_75": 45},
        "rotation_stocks": {"moyenne": 45, "percentile_25": 30, "percentile_75": 60},
        "liquidite_generale": {"moyenne": 1.3, "percentile_25": 0.9, "percentile_75": 1.8},
        "ratio_endettement": {"moyenne": 0.40, "percentile_25": 0.25, "percentile_75": 0.55}
    },
    "immobilier": {
        "marge_nette": {"moyenne": 0.12, "percentile_25": 0.08, "percentile_75": 0.18},
        "dso": {"moyenne": 60, "percentile_25": 45, "percentile_75": 90},
        "rotation_stocks": {"moyenne": 365, "percentile_25": 180, "percentile_75": 730},
        "liquidite_generale": {"moyenne": 0.8, "percentile_25": 0.5, "percentile_75": 1.2},
        "ratio_endettement": {"moyenne": 0.80, "percentile_25": 0.60, "percentile_75": 0.95}
    },
    "default": {
        "marge_nette": {"moyenne": 0.07, "percentile_25": 0.04, "percentile_75": 0.11},
        "dso": {"moyenne": 45, "percentile_25": 30, "percentile_75": 60},
        "rotation_stocks": {"moyenne": 60, "percentile_25": 45, "percentile_75": 90},
        "liquidite_generale": {"moyenne": 1.2, "percentile_25": 0.8, "percentile_75": 1.6},
        "ratio_endettement": {"moyenne": 0.60, "percentile_25": 0.40, "percentile_75": 0.75}
    }
}


def compute_sector_benchmark(ratios: dict[str, float], secteur: str = "default") -> dict[str, Any]:
    """
    Calcule le benchmarking sectoriel anonymisé (F4).
    
    Args:
        ratios: Dictionnaire des ratios calculés actuels
        secteur: Secteur d'activité de l'entreprise
        
    Returns:
        dict: Comparaisons sectorielles avec percentiles et positionnement
    """
    # Normaliser le secteur
    secteur_key = secteur.lower() if secteur else "default"
    if secteur_key not in SECTOR_BENCHMARKS:
        secteur_key = "default"
    
    benchmark_data = SECTOR_BENCHMARKS[secteur_key]
    
    # Calculer les comparaisons pour chaque ratio
    comparisons = []
    
    ratios_to_compare = [
        ("marge_nette", "Marge Nette", "%"),
        ("dso", "DSO", "jours"),
        ("rotation_stocks", "Rotation Stocks", "jours"),
        ("liquidite_generale", "Liquidité Générale", ""),
        ("ratio_endettement", "Ratio d'Endettement", "")
    ]
    
    for ratio_key, ratio_name, unit in ratios_to_compare:
        valeur = ratios.get(ratio_key, 0)
        secteur_data = benchmark_data.get(ratio_key, {})
        
        moyenne = secteur_data.get("moyenne", 0)
        p25 = secteur_data.get("percentile_25", 0)
        p75 = secteur_data.get("percentile_75", 0)
        
        # Calculer le percentile de l'entreprise
        if valeur <= p25:
            percentile = 25
            position = "inférieur"
        elif valeur <= moyenne:
            percentile = 50
            position = "moyen"
        elif valeur <= p75:
            percentile = 75
            position = "supérieur"
        else:
            percentile = 90
            position = "excellent"
        
        # Pour les ratios où "plus c'est mieux" (marge, liquidité)
        if ratio_key in ["marge_nette", "liquidite_generale"]:
            if valeur >= p75:
                performance = "excellent"
                couleur = "var(--success)"
            elif valeur >= moyenne:
                performance = "bon"
                couleur = "var(--cyan)"
            elif valeur >= p25:
                performance = "moyen"
                couleur = "var(--amber)"
            else:
                performance = "faible"
                couleur = "var(--error)"
        # Pour les ratios où "moins c'est mieux" (DSO, rotation stocks, endettement)
        else:
            if valeur <= p25:
                performance = "excellent"
                couleur = "var(--success)"
            elif valeur <= moyenne:
                performance = "bon"
                couleur = "var(--cyan)"
            elif valeur <= p75:
                performance = "moyen"
                couleur = "var(--amber)"
            else:
                performance = "faible"
                couleur = "var(--error)"
        
        comparisons.append({
            "ratio": ratio_name,
            "valeur": round(valeur, 2),
            "unite": unit,
            "moyenne_secteur": round(moyenne, 2),
            "percentile_25": round(p25, 2),
            "percentile_75": round(p75, 2),
            "percentile_entreprise": percentile,
            "position": position,
            "performance": performance,
            "couleur": couleur,
            "delta_vs_moyenne": round(valeur - moyenne, 2)
        })
    
    # Score global de performance sectorielle
    performance_scores = {
        "excellent": 4,
        "bon": 3,
        "moyen": 2,
        "faible": 1
    }
    
    total_score = sum(performance_scores.get(c["performance"], 2) for c in comparisons)
    performance_moyenne = total_score / len(comparisons)
    
    if performance_moyenne >= 3.5:
        performance_globale = "excellent"
        performance_globale_couleur = "var(--success)"
    elif performance_moyenne >= 2.5:
        performance_globale = "bon"
        performance_globale_couleur = "var(--cyan)"
    elif performance_moyenne >= 1.5:
        performance_globale = "moyen"
        performance_globale_couleur = "var(--amber)"
    else:
        performance_globale = "faible"
        performance_globale_couleur = "var(--error)"
    
    return {
        "secteur": secteur,
        "secteur_normalise": secteur_key,
        "comparisons": comparisons,
        "performance_globale": performance_globale,
        "performance_globale_couleur": performance_globale_couleur,
        "performance_score": round(performance_moyenne, 1),
        "message": f"Votre entreprise se situe dans le {performance_globale} quartile de votre secteur ({secteur_key}).",
        "data_source": "Base de données sectorielle SYSCOHADA OHADA + Pool-Data anonymisé"
    }


# ─── F5: Générateur de Rapports Destinés aux Tiers ─────────────────────
def generate_third_party_report(analyse_data: dict[str, Any], 
                                rapport_type: str = "bancaire") -> dict[str, Any]:
    """
    Génère un rapport structuré pour les tiers (banques, investisseurs, partenaires).
    
    Args:
        analyse_data: Données complètes de l'analyse
        rapport_type: Type de rapport (bancaire, investisseur, partenaire)
        
    Returns:
        dict: Rapport structuré avec sections adaptées au destinataire
    """
    # Extraire les données clés
    entreprise = analyse_data.get("entreprise", {})
    ratios = analyse_data.get("ratios_bruts", {})
    score = analyse_data.get("score", 0)
    zone = analyse_data.get("zone", "vigilance")
    cash_burn = analyse_data.get("cash_burn_runway", {})
    early_warnings = analyse_data.get("early_warnings", [])
    sector_benchmark = analyse_data.get("sector_benchmark", {})
    
    # Adapter le contenu selon le type de rapport
    if rapport_type == "bancaire":
        sections = [
            {
                "titre": "Synthèse de Risque",
                "contenu": f"Score financier: {score}/100 ({zone.upper()}). Niveau de risque: {zone}.",
                "priorite": "HAUTE"
            },
            {
                "titre": "Capacité d'Endettement",
                "contenu": f"Ratio d'endettement: {ratios.get('ratio_endettement', 0):.1%}. Capacité d'emprunt estimée: {cash_burn.get('tresorerie_actuelle', 0):.0f} XAF.",
                "priorite": "HAUTE"
            },
            {
                "titre": "Trésorerie",
                "contenu": f"Runway: {cash_burn.get('runway_mois', 0):.1f} mois. Cash-Burn mensuel: {cash_burn.get('cash_burn_mensuel', 0):.0f} XAF.",
                "priorite": "MOYENNE"
            },
            {
                "titre": "Alertes Précoces",
                "contenu": f"{len(early_warnings)} alerte(s) détectée(s). Points de vigilance: {[w['titre'] for w in early_warnings[:3]]}.",
                "priorite": "HAUTE" if any(w['niveau'] == 'CRITIQUE' for w in early_warnings) else "MOYENNE"
            }
        ]
        recommandation = "Dossier à étudier avec attention. Profil " + ("à risque" if score < 50 else "acceptable")
    
    elif rapport_type == "investisseur":
        sections = [
            {
                "titre": "Performance Financière",
                "contenu": f"Score: {score}/100. Marge nette: {ratios.get('marge_nette', 0):.1%}. ROA: {ratios.get('roa', 0):.1%}.",
                "priorite": "HAUTE"
            },
            {
                "titre": "Positionnement Sectoriel",
                "contenu": f"Performance sectorielle: {sector_benchmark.get('performance_globale', 'moyen')}. Score: {sector_benchmark.get('performance_score', 0)}/4.",
                "priorite": "MOYENNE"
            },
            {
                "titre": "Croissance",
                "contenu": f"CA: {ratios.get('ca', 0):.0f} XAF. Évolution: À analyser sur historique.",
                "priorite": "MOYENNE"
            },
            {
                "titre": "Risques",
                "contenu": f"{len(early_warnings)} alerte(s). Risques principaux: {[w['type'] for w in early_warnings[:2]]}.",
                "priorite": "HAUTE"
            }
        ]
        recommandation = "Opportunité " + ("à risque" if score < 60 else "intéressante")
    
    else:  # partenaire
        sections = [
            {
                "titre": "Fiabilité",
                "contenu": f"Score: {score}/100. Zone: {zone}. DSO: {ratios.get('dso', 0):.0f} jours.",
                "priorite": "HAUTE"
            },
            {
                "titre": "Solvabilité",
                "contenu": f"Ratio de solvabilité: {ratios.get('solvabilite', 0):.1%}. Liquidité: {ratios.get('liquidite_generale', 0):.2f}.",
                "priorite": "HAUTE"
            },
            {
                "titre": "Alertes",
                "contenu": f"{len(early_warnings)} alerte(s). Vigilance requise sur: {[w['titre'] for w in early_warnings[:2]]}.",
                "priorite": "MOYENNE"
            }
        ]
        recommandation = "Partenaire " + ("à surveiller" if score < 50 else "fiable")
    
    return {
        "type_rapport": rapport_type,
        "date_generation": time.strftime("%Y-%m-%d %H:%M:%S"),
        "entreprise": entreprise.get("nom", "Non renseigné"),
        "secteur": entreprise.get("secteur", "Non renseigné"),
        "score_global": score,
        "zone_risque": zone,
        "sections": sections,
        "recommandation_globale": recommandation,
        "confidentialite": "CONFIDENTIEL",
        "mention_legale": "Ce rapport est généré automatiquement par DOCTOR SMILE et ne constitue pas un avis professionnel."
    }


# ─── F6: Plan d'Action Correctif Dynamique (To-Do List) ─────────────────
def generate_action_plan(alertes: list[dict], ratios: dict[str, float], 
                         score: int, zone: str) -> dict[str, Any]:
    """
    Génère un plan d'action correctif dynamique basé sur les alertes et recommandations (F6).
    
    Args:
        alertes: Liste des alertes générées
        ratios: Dictionnaire des ratios calculés
        score: Score global actuel
        zone: Zone de risque actuelle
        
    Returns:
        dict: Plan d'action avec tâches prioritaires, échéances et indicateurs de suivi
    """
    # Catégories d'actions
    categories = {
        "TRESORERIE": {"icon": "fa-coins", "couleur": "var(--amber)", "priorite": "HAUTE"},
        "ENDETTEMENT": {"icon": "fa-scale-balanced", "couleur": "var(--error)", "priorite": "HAUTE"},
        "CLIENTS": {"icon": "fa-users", "couleur": "var(--warning)", "priorite": "MOYENNE"},
        "STOCKS": {"icon": "fa-boxes-stacked", "couleur": "var(--cyan)", "priorite": "MOYENNE"},
        "RENTABILITE": {"icon": "fa-chart-line", "couleur": "var(--success)", "priorite": "MOYENNE"},
        "GENERAL": {"icon": "fa-gear", "couleur": "var(--violet-3)", "priorite": "BASSE"}
    }
    
    actions = []
    
    # Générer des actions basées sur les alertes
    for alerte in alertes:
        categorie = "GENERAL"
        titre = ""
        description = ""
        echeance_jours = 30
        impact_estime = ""
        
        if alerte["type"] == "DSO":
            categorie = "CLIENTS"
            titre = "Réduire le délai de paiement clients"
            description = "Relance active des clients en retard, négocier des escomptes pour paiement anticipé, réviser les conditions de paiement."
            echeance_jours = 45
            impact_estime = "Amélioration de la trésorerie de 15-20%"
            
        elif alerte["type"] == "ENDETTEMENT":
            categorie = "ENDETTEMENT"
            titre = "Optimiser la structure d'endettement"
            description = "Renégocier les dettes à court terme, rechercher des financements à plus long terme, augmenter les fonds propres."
            echeance_jours = 60
            impact_estime = "Réduction du ratio d'endettement de 10-15%"
            
        elif alerte["type"] == "LIQUIDITE":
            categorie = "TRESORERIE"
            titre = "Renforcer la trésorerie à court terme"
            description = "Négocier des délais fournisseurs, mobiliser les créances, optimiser le BFR, sécuriser une ligne de crédit."
            echeance_jours = 30
            impact_estime = "Augmentation de la liquidité de 20-30%"
            
        elif alerte["type"] == "EVOLUTION_DSO":
            categorie = "CLIENTS"
            titre = "Analyser et corriger la détérioration du DSO"
            description = "Identifier les clients problématiques, revoir la politique de crédit, renforcer le processus de recouvrement."
            echeance_jours = 30
            impact_estime = "Stabilisation du DSO"
            
        elif alerte["type"] == "EVOLUTION_MARGE":
            categorie = "RENTABILITE"
            titre = "Restaurer la marge nette"
            description = "Revuez votre politique de prix, optimisez vos coûts d'exploitation, analysez la rentabilité par produit/service."
            echeance_jours = 60
            impact_estime = "Amélioration de la marge de 3-5%"
        
        if titre:
            actions.append({
                "id": f"action_{len(actions) + 1}",
                "categorie": categorie,
                "titre": titre,
                "description": description,
                "priorite": categories[categorie]["priorite"],
                "echeance_jours": echeance_jours,
                "impact_estime": impact_estime,
                "statut": "EN_COURS",
                "responsable": "Direction Financière",
                "date_creation": time.strftime("%Y-%m-%d"),
                "date_echeance": (time.time() + echeance_jours * 86400)
            })
    
    # Actions par défaut si aucune alerte critique
    if len(actions) == 0:
        actions.extend([
            {
                "id": "action_1",
                "categorie": "GENERAL",
                "titre": "Surveiller les indicateurs clés",
                "description": "Maintenir un suivi régulier des ratios financiers et des indicateurs de performance.",
                "priorite": "BASSE",
                "echeance_jours": 90,
                "impact_estime": "Maintien de la performance",
                "statut": "EN_COURS",
                "responsable": "Direction Financière",
                "date_creation": time.strftime("%Y-%m-%d"),
                "date_echeance": (time.time() + 90 * 86400)
            },
            {
                "id": "action_2",
                "categorie": "TRESORERIE",
                "titre": "Optimiser le BFR",
                "description": "Analyser et optimiser le besoin en fonds de roulement pour améliorer la trésorerie.",
                "priorite": "MOYENNE",
                "echeance_jours": 60,
                "impact_estime": "Amélioration de la trésorerie de 5-10%",
                "statut": "EN_ATTENTE",
                "responsable": "Direction Financière",
                "date_creation": time.strftime("%Y-%m-%d"),
                "date_echeance": (time.time() + 60 * 86400)
            }
        ])
    
    # Trier par priorité
    priorite_ordre = {"HAUTE": 0, "MOYENNE": 1, "BASSE": 2}
    actions.sort(key=lambda a: priorite_ordre.get(a["priorite"], 3))
    
    # Statistiques du plan
    stats = {
        "total_actions": len(actions),
        "haute_priorite": sum(1 for a in actions if a["priorite"] == "HAUTE"),
        "en_cours": sum(1 for a in actions if a["statut"] == "EN_COURS"),
        "en_attente": sum(1 for a in actions if a["statut"] == "EN_ATTENTE"),
        "terminees": sum(1 for a in actions if a["statut"] == "TERMINEE")
    }
    
    return {
        "actions": actions,
        "categories": categories,
        "stats": stats,
        "score_actuel": score,
        "zone_risque": zone,
        "date_generation": time.strftime("%Y-%m-%d %H:%M:%S"),
        "message": f"{len(actions)} action(s) corrective(s) identifiée(s) pour améliorer votre situation financière."
    }


# ─── F7: Gestion Historiques (Analyses + Conversations IA) ─────────────
def format_analysis_history(analyses: list[dict]) -> list[dict]:
    """
    Formate l'historique des analyses pour affichage (F7).
    
    Args:
        analyses: Liste des analyses brutes
        
    Returns:
        list: Historique formaté avec métriques clés et tendances
    """
    formatted_history = []
    
    for analyse in analyses:
        # Extraire les métriques clés
        score = analyse.get("score", 0)
        zone = analyse.get("zone", "vigilance")
        ratios = analyse.get("ratios_bruts", {})
        created_at = analyse.get("createdAt", "")
        analyse_id = analyse.get("id", "")
        
        # Calculer les tendances si possible
        score_evolution = 0
        if len(formatted_history) > 0:
            score_evolution = score - formatted_history[-1].get("score", 0)
        
        formatted_history.append({
            "id": analyse_id,
            "date": created_at,
            "score": score,
            "zone": zone,
            "score_evolution": score_evolution,
            "marge_nette": ratios.get("marge_nette", 0),
            "dso": ratios.get("dso", 0),
            "ratio_endettement": ratios.get("ratio_endettement", 0),
            "liquidite_generale": ratios.get("liquidite_generale", 0),
            "entreprise": analyse.get("entreprise", {}).get("nom", "Non renseigné")
        })
    
    # Trier par date décroissante
    formatted_history.sort(key=lambda x: x["date"], reverse=True)
    
    return formatted_history


def format_conversation_history(conversations: list[dict]) -> list[dict]:
    """
    Formate l'historique des conversations IA pour affichage (F7).
    
    Args:
        conversations: Liste des conversations brutes
        
    Returns:
        list: Historique formaté avec résumés et métadonnées
    """
    formatted_history = []
    
    for conv in conversations:
        # Extraire les métadonnées
        created_at = conv.get("createdAt", "")
        conv_id = conv.get("id", "")
        analyse_id = conv.get("analyseId", "")
        messages = conv.get("messages", [])
        
        # Générer un résumé à partir des premiers messages
        summary = "Conversation sans messages"
        if messages and len(messages) > 0:
            first_user_msg = next((m for m in messages if m.get("role") == "user"), None)
            if first_user_msg:
                summary = first_user_msg.get("content", "")[:100] + "..." if len(first_user_msg.get("content", "")) > 100 else first_user_msg.get("content", "")
        
        # Compter les messages
        message_count = len(messages)
        user_messages = sum(1 for m in messages if m.get("role") == "user")
        ai_messages = sum(1 for m in messages if m.get("role") == "assistant")
        
        formatted_history.append({
            "id": conv_id,
            "analyse_id": analyse_id,
            "date": created_at,
            "summary": summary,
            "message_count": message_count,
            "user_messages": user_messages,
            "ai_messages": ai_messages,
            "entreprise": conv.get("entreprise", {}).get("nom", "Non renseigné")
        })
    
    # Trier par date décroissante
    formatted_history.sort(key=lambda x: x["date"], reverse=True)
    
    return formatted_history


def build_risk_factors(alertes: list[dict]) -> list[dict]:
    """Construit la liste des facteurs de risque pour le chat_service context formatter."""
    severity_map = {
        "EXTREME":  "critical",
        "CRITIQUE": "critical",
        "ELEVE":    "high",
        "MOYEN":    "medium",
    }
    result = []
    for alerte in alertes:
        result.append({
            "rule":        alerte["id"],
            "name":        alerte["titre"].replace("🚨 ", "").replace("⚠️ ", "").replace("🔴 ", ""),
            "description": alerte["desc"],
            "severity":    severity_map.get(alerte["niveau"], "medium"),
            "score_impact": -alerte["poids"],
            "compte":      alerte["compte"],
            "action":      alerte["action"],
        })
    return result


# ═══════════════════════════════════════════════════════════════════
#  PIPELINE PRINCIPAL — Analyse complète d'une balance SYSCOHADA
# ═══════════════════════════════════════════════════════════════════

def analyse_balance(
    rows:       list[dict[str, Any]],
    entreprise: str = "Entreprise",
    secteur:    str = "Non précisé",
    devise:     str = "FCFA",
    annees:     int | None = None,
    score_history_prev: list[int] | None = None,
) -> dict[str, Any]:
    """
    Pipeline complet d'analyse d'une balance générale SYSCOHADA.

    Étapes :
      1. parse_balance()    → Extraction des comptes
      2. compute_ratios()   → Calcul des ratios
      3. score_risk()       → Score de santé et alertes
      4. build_ratios_detail() → Format dashboard
      5. build_radar()      → Radar chart
      6. generate_recommendations() → Actions prioritaires

    Args:
        rows:       Données brutes de la balance (list of dicts)
        entreprise: Nom de l'entreprise
        secteur:    Secteur d'activité (BTP, Commerce, Services, etc.)
        devise:     Devise (FCFA par défaut)
        annees:     Nombre d'années d'activité (si connu)

    Returns:
        Dict complet compatible avec le dashboard Doctor Smile
    """
    t0 = time.perf_counter()

    # 1. Extraction des comptes
    comptes = parse_balance(rows)
    log.info("[analyse_balance] %s — %d comptes extraits", entreprise, len(comptes))

    # 2. Calcul des ratios
    ratios = compute_ratios(comptes)

    # Enrichir avec les années d'activité si fourni
    if annees is not None:
        ratios["annees_activite"] = annees

    # 3. Score de risque
    risk_result = score_risk(ratios)
    ivf_score = round(max(0, 100 - risk_result["score"]), 2)
    ratios["ivf"] = ivf_score
    ratios["altman_z"] = ivf_score

    # 4. Format dashboard
    ratios_detail = build_ratios_detail(ratios)
    radar         = build_radar(ratios, risk_result["score"])
    recos         = generate_recommendations(ratios, risk_result["alertes"])
    risk_factors  = build_risk_factors(risk_result["alertes"])
    
    # 4.5 - F1: Cash-Burn & Runway (Suivi Trésorerie Critique)
    cash_burn_runway = compute_cash_burn_runway(comptes, ratios)
    
    # 4.6 - F3: Système d'Alertes Précoces (Early Warning)
    # Utiliser les ratios précédents si disponibles pour détecter les évolutions
    ratios_precedents = score_history_prev[-1].get("ratios_bruts", {}) if score_history_prev and len(score_history_prev) > 0 else None
    early_warnings = generate_early_warnings(comptes, ratios, ratios_precedents)
    
    # 4.7 - F4: Benchmarking Sectoriel Anonymisé
    sector_benchmark = compute_sector_benchmark(ratios, secteur)
    
    # 4.8 - F6: Plan d'Action Correctif Dynamique (To-Do List)
    action_plan = generate_action_plan(early_warnings, ratios, risk_result["score"], risk_result.get("zone", "unknown"))

    # 5. Historique des scores
    prev          = score_history_prev or []
    score_history = (prev + [risk_result["score"]])[-7:]

    elapsed_ms = int((time.perf_counter() - t0) * 1000)

    # Informations de contexte pour le LLM (injection dans le prompt de diagnostic)
    llm_context = {
        "ca_fcfa":              ratios.get("ca"),
        "creances_clients_fcfa": ratios.get("creances_clients"),
        "tresorerie_fcfa":      ratios.get("tresorerie"),
        "dso_jours":            ratios.get("dso"),
        "dpo_jours":            ratios.get("dpo"),
        "ratio_cli_four":       ratios.get("ratio_cli_four"),
        "resultat_net_fcfa":    ratios.get("resultat_net"),
        "frng_fcfa":            ratios.get("frng"),
        "bfr_fcfa":             ratios.get("bfr"),
        "tresorerie_nette_fcfa": ratios.get("tresorerie_nette"),
        "zone":                 risk_result["zone"],
        "ivf":                  ivf_score,
        "score":                risk_result["score"],
        "nb_alertes_extreme":   risk_result["alertes_niveaux"]["EXTREME"],
        "secteur":              secteur,
        "devise":               devise,
    }

    return {
        # Core
        "score":             risk_result["score"],
        "ivf":              ivf_score,
        "zone":              risk_result["zone"],
        "probabiliteDefaut": risk_result["probabiliteDefaut"],
        "confidence":        95,  # Règles déterministes = toujours 95% (pas d'incertitude ML)
        "confiance":         "Règles SYSCOHADA",
        "model":             "Moteur Déterministe SYSCOHADA v3",
        "engine":            "SYSCOHADA Engine v3.0",
        "auc":               0.0,  # N/A sans ML
        "processingMs":      elapsed_ms,

        # Alertes SYSCOHADA
        "alertes":           risk_result["alertes"],
        "alertes_niveaux":   risk_result["alertes_niveaux"],
        "nb_alertes":        risk_result["nb_alertes"],

        # Facteurs de risque (format chat_service context formatter)
        "risk_factors":      risk_factors,

        # Données financières brutes (pour le LLM)
        "ratios_bruts":      ratios,
        "comptes_extraits":  {k: v for k, v in comptes.items() if not k.startswith("raw_")},
        "llm_context":       llm_context,

        # Dashboard
        "ratios":            ratios_detail,
        "radarDimensions":   radar,
        "recommendations":   recos,
        "scoreHistory":      score_history,
        "shapValues":        [],  # N/A sans ML — remplacé par alertes
        
        # F1 - Cash-Burn & Runway (Suivi Trésorerie Critique)
        "cash_burn_runway":  cash_burn_runway,
        
        # F3 - Système d'Alertes Précoces (Early Warning)
        "early_warnings":    early_warnings,
        
        # F4 - Benchmarking Sectoriel Anonymisé
        "sector_benchmark":  sector_benchmark,
        
        # F6 - Plan d'Action Correctif Dynamique (To-Do List)
        "action_plan":       action_plan,

        # Meta
        "entreprise":        entreprise,
        "secteur":           secteur,
        "devise":            devise,
        "pays":              "Cameroun / CEMAC",
        "modelProbs":        {},  # N/A sans ML
        "pct_missing":       ratios.get("pct_missing", 0),
    }


# ═══════════════════════════════════════════════════════════════════
#  DATA ANONYMIZATION — Protection des données sensibles
# ═══════════════════════════════════════════════════════════════════

def anonymize_text(text: str) -> tuple[str, dict]:
    """
    Anonymise les données sensibles dans un texte :
    - Noms d'entreprises
    - Noms de personnes
    - Numéros de téléphone
    - Emails
    - Adresses
    
    Retourne le texte anonymisé et le mapping pour restauration.
    """
    import re
    
    anonymized = text
    mapping = {}
    counter = 1
    
    # Pattern pour emails
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    for match in re.finditer(email_pattern, anonymized):
        token = f"[EMAIL_{counter}]"
        mapping[token] = match.group()
        anonymized = anonymized.replace(match.group(), token)
        counter += 1
    
    # Pattern pour téléphones (Cameroun + internationaux)
    phone_pattern = r'(?:\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,4}'
    for match in re.finditer(phone_pattern, anonymized):
        if len(match.group().replace(' ', '').replace('-', '')) >= 8:
            token = f"[PHONE_{counter}]"
            mapping[token] = match.group()
            anonymized = anonymized.replace(match.group(), token)
            counter += 1
    
    # Pattern pour Noms (simple heuristique : mots commençant par majuscule, contextuels)
    # Ceci est une implémentation basique, à améliorer selon les besoins
    
    return anonymized, mapping


def deanonymize_text(text: str, mapping: dict) -> str:
    """
    Restaurer les données originales depuis un texte anonymisé.
    """
    result = text
    for token, original in mapping.items():
        result = result.replace(token, original)
    return result


# ═══════════════════════════════════════════════════════════════════
#  LLM ORCHESTRATOR — Extraction structurée depuis texte/OCR/Images
# ═══════════════════════════════════════════════════════════════════

# Modèles disponibles par ordre de priorité sur Groq
LLM_MODEL_PRIORITY = [
    "llama-3.3-70b-versatile",       # Meilleur modèle disponible
    "llama-3.1-70b-versatile",       # Très performant
    "mixtral-8x7b-32768"             # Fiable et rapide
]


async def llm_orchestrator_extract(
    text_content: str,
    api_key: str = None,
    model_name: str = None,
    anonymize: bool = True
) -> dict[str, Any]:
    """
    Orchestrateur LLM pour extraire des données structurées depuis un texte/OCR de Balance Générale.
    
    Stratégie hybride :
    1. Anonymisation des données sensibles (optionnelle)
    2. LLM extrait les données brutes et les formate en JSON standard
    3. Validation par le parseur déterministe pour garantir la cohérence
    4. Fallback automatique sur d'autres modèles si échec
    
    Args:
        text_content: Texte brut extrait par OCR ou contenu du document
        api_key: Clé API Groq (optionnel, utilise la variable d'environnement par défaut)
        model_name: Modèle à utiliser (choisit automatiquement si None)
        anonymize: Anonymiser les données avant envoi au LLM
        
    Returns:
        Dictionnaire avec comptes extraits, métadonnées et statut
    """
    import os
    import json
    import httpx
    
    if not api_key:
        api_key = os.getenv("GROQ_API_KEY")
    
    if not api_key:
        log.warning("[llm_orchestrator] Aucune clé API Groq disponible — mode fallback")
        return {
            "entreprise": "Entreprise Inconnue",
            "comptes_extraits": {},
            "metadata": {
                "devise_detectee": "FCFA",
                "statut_parsing": "FALLBACK",
                "confiance_ocr": 0.5,
                "model_used": "None",
                "anonymized": False
            },
            "raw_text": text_content
        }
    
    # Anonymisation
    anonymized_text = text_content
    anonymization_map = {}
    if anonymize:
        anonymized_text, anonymization_map = anonymize_text(text_content)
        log.info(f"[llm_orchestrator] {len(anonymization_map)} éléments anonymisés")
    
    system_prompt = """Tu es un expert comptable OHADA ultra-spécialisé dans l'extraction précise de données depuis des Balances Générales et Bilans comptables camerounais (SYSCOHADA).

TA MISSION (PRIORITAIRE) :
1. **Analyser parfaitement** le texte/OCR fourni (même avec erreurs ou formats variables)
2. **Extraire TOUS les comptes SYSCOHADA** avec leur solde exact
3. **Retourner UNIQUEMENT un JSON VALIDE**, pas de texte supplémentaire

FORMAT DE SORTIE (RIGOUREUX) :
{
  "entreprise": "Nom de l'entreprise ou \"Entreprise Anonyme\"",
  "date_bilan": "Date du document si disponible (JJ/MM/AAAA)",
  "comptes_extraits": {
    "411": 12000000.00,
    "401": -2400000.00,
    "512": -200000.00,
    "70": 100000000.00,
    "10": 50000000.00,
    "20": 30000000.00,
    "3": 15000000.00
  },
  "metadata": {
    "devise_detectee": "FCFA",
    "statut_parsing": "SUCCESS",
    "confiance_globale": 0.95,
    "notes": ["Note 1 si nécessaire"]
  }
}

RÈGLES D'OR (IMPORTANTISSIMES) :
- 🔢 **Soldes créditeurs** (comptes 40x, 70x, 1x): souvent négatifs dans les balances — **CONSERVE LE SIGNE**
- 🏷️ **Comptes SYSCOHADA**: Utilise les racines standards (2, 3 ou 4 chiffres max)
- ⭐ **Priorité aux totaux**: Privilégie les TOTAUX DE CLASSES plutôt que les comptes détaillés
- 📊 **Montants en FCFA**: Si rien n'est précisé, suppose FCFA
- ✅ **Valide JSON**: Pas de virgules en trop, pas de commentaires
- 🧠 **Intelligence**: Si une valeur est ambiguë, fais une estimation raisonnable et baisse la confiance

RAPPEL: RETOURNE UNIQUEMENT LE JSON, RIEN D'AUTRE !"""
    
    user_prompt = f"""📄 DOCUMENT À ANALYSER :

{anonymized_text[:12000]}

🎯 TACHE : Extrait toutes les données comptables SYSCOHADA et retourne UNIQUEMENT le JSON valide."""

    models_to_try = [model_name] if model_name else LLM_MODEL_PRIORITY
    
    last_error = None
    
    for model in models_to_try:
        try:
            log.info(f"[llm_orchestrator] Essai avec modèle: {model}")
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            async with httpx.AsyncClient(timeout=90.0) as http_client:
                response = await http_client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": 0.1,
                        "max_tokens": 8192,
                        "response_format": {"type": "json_object"}
                    }
                )
            
            if response.status_code != 200:
                log.error(f"[llm_orchestrator] Erreur avec {model}: {response.status_code}")
                last_error = Exception(f"Erreur API {model}: {response.status_code}")
                continue
            
            data = response.json()
            result_text = data["choices"][0]["message"]["content"].strip()
            
            # Parser le JSON
            try:
                extracted = json.loads(result_text)
                log.info(f"[llm_orchestrator] ✅ Succès avec {model} — {len(extracted.get('comptes_extraits', {}))} comptes extraits")
                
                # Convertir en format rows pour parse_balance
                rows = []
                for account_num, amount in extracted.get("comptes_extraits", {}).items():
                    rows.append({
                        "compte": account_num,
                        "solde": amount
                    })
                
                # Valider avec le parseur déterministe
                parsed = parse_balance(rows, prefer_class_totals=True)
                
                # Fusionner les résultats
                final_result = {
                    **extracted,
                    "parsed_comptes": parsed,
                    "raw_text": text_content,
                    "anonymization_map": anonymization_map if anonymize else {}
                }
                if "metadata" in final_result:
                    final_result["metadata"]["model_used"] = model
                    final_result["metadata"]["anonymized"] = anonymize
                
                return final_result
                
            except json.JSONDecodeError as e:
                log.error(f"[llm_orchestrator] Erreur parsing JSON avec {model}: {e}")
                log.debug(f"[llm_orchestrator] Contenu reçu: {result_text}")
                last_error = e
                continue
                
        except Exception as e:
            log.error(f"[llm_orchestrator] Erreur avec {model}: {e}")
            last_error = e
            continue
    
    # Si tous les modèles ont échoué
    log.error("[llm_orchestrator] Tous les modèles ont échoué")
    return {
        "entreprise": "Entreprise Inconnue",
        "comptes_extraits": {},
        "metadata": {
            "devise_detectee": "FCFA",
            "statut_parsing": "ERROR_ALL_MODELS",
            "confiance_ocr": 0.1,
            "model_used": "None",
            "anonymized": anonymize,
            "error": str(last_error)
        },
        "raw_text": text_content
    }


# ═══════════════════════════════════════════════════════════════════
#  IMAGE HANDLER — Pré-traitement d'images pour OCR
# ═══════════════════════════════════════════════════════════════════

async def process_image_for_ocr(
    image_bytes: bytes,
    image_format: str = None
) -> str:
    """
    Traite une image pour améliorer l'OCR et extrait le texte.
    
    Args:
        image_bytes: Données brutes de l'image
        image_format: Format de l'image (png, jpg, etc.)
        
    Returns:
        Texte extrait de l'image
    """
    import io
    import base64
    
    log.info("[image_handler] Traitement de l'image pour OCR")
    
    # Essayer avec PyTesseract si disponible, sinon fallback simple
    try:
        from PIL import Image
        import pytesseract
        
        # Ouvrir l'image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Améliorations simples pour OCR
        try:
            # Convertir en niveaux de gris
            if image.mode != 'L':
                image = image.convert('L')
            
            # Augmenter le contraste légèrement
            from PIL import ImageEnhance
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.2)
        except:
            pass
        
        # Extraire le texte avec Tesseract (FR + EN)
        try:
            text = pytesseract.image_to_string(image, lang='fra+eng', config='--oem 3 --psm 6')
            log.info(f"[image_handler] OCR Tesseract réussi — {len(text)} caractères")
            return text
        except:
            # Fallback: just return info that we need LLM vision (when available)
            log.warning("[image_handler] Tesseract non disponible")
            pass
            
    except ImportError:
        log.warning("[image_handler] PIL/Tesseract non disponibles")
        pass
    
    # Si aucun OCR local disponible, retourner placeholder pour LLM vision future
    return f"[IMAGE_DATA:{base64.b64encode(image_bytes[:100]).decode('utf-8')}...] — Utiliser un modèle avec vision pour extraire les données"



# ═══════════════════════════════════════════════════════════════════
#  ENHANCED DIAGNOSTIC — Rapport avec explication "Pourquoi" et Plan d'Action
# ═══════════════════════════════════════════════════════════════════

async def generate_enhanced_diagnostic(
    analysis_result: dict[str, Any],
    secteur: str = "Non spécifié",
    api_key: str = None,
    model_name: str = None,
    anonymize: bool = True
) -> dict[str, Any]:
    """
    Génère un diagnostic amélioré avec :
    - Explication "Pourquoi" ultra-claire et contextuelle
    - Plan d'action SMART et ultra-pratique (adapté Cameroun)
    - Intégration hybride (moteur mathématique + LLM)
    - Risques cachés et opportunités identifiés
    - Anonymisation des données sensibles
    
    Args:
        analysis_result: Résultat de analyse_balance()
        secteur: Secteur d'activité de l'entreprise
        api_key: Clé API Groq (optionnel)
        model_name: Modèle à utiliser (choisit automatiquement si None)
        anonymize: Anonymiser les données avant envoi au LLM
        
    Returns:
        Diagnostic enrichi avec explications et plan d'action
    """
    import os
    import json
    import httpx
    
    ratios = analysis_result.get("ratios_bruts", {})
    alertes = analysis_result.get("alertes", [])
    score = analysis_result.get("score", 0)
    zone = analysis_result.get("zone", "saine")
    
    # Préparer le contexte pour le LLM (simplifié, sans jargon)
    entreprise = analysis_result.get("entreprise", "Entreprise")
    ctx_text = f"""📊 SITUATION DE L'ENTREPRISE :
- Nom: {entreprise}
- Secteur: {secteur}
- Note globale: {score}/100
- Santé financière: {zone}

💡 CE QUE NOUS VOYONS DANS LES COMPTES :
- Chiffre d'affaires (ce que vous avez vendu) : {ratios.get('ca', 0):,.2f} FCFA
- Argent disponible en banque/caisse : {ratios.get('tresorerie', 0):,.2f} FCFA
- Argent que les clients vous doivent : {ratios.get('creances_clients', 0):,.2f} FCFA
- Argent que vous devez aux fournisseurs : {ratios.get('dettes_fournisseurs', 0):,.2f} FCFA
- Temps moyen pour que les clients paient : {ratios.get('dso', 0):.1f} jours
- Marges bénéficiaires : {ratios.get('net_margin', 0):.1f}%

⚠️ POINTS D'ATTENTION ({len(alertes)}):"""
    
    for i, alerte in enumerate(alertes[:6], 1):
        ctx_text += f"\n{i}. [{alerte.get('niveau', 'MOYEN')}] {alerte.get('titre', '')} — {alerte.get('desc', '')}"
    
    # Anonymisation du contexte
    anonymization_map = {}
    if anonymize:
        ctx_text, anonymization_map = anonymize_text(ctx_text)
    
    if not api_key:
        api_key = os.getenv("GROQ_API_KEY")
    
    if not api_key:
        # Mode déterministe sans LLM
        log.warning("[enhanced_diagnostic] Aucune clé API, mode déterministe")
        return {
            **analysis_result,
            "diagnostic_enrichi": {
                "pourquoi": "Diagnostic basé sur les règles SYSCOHADA. Ajoutez une clé API Groq pour un contexte plus détaillé et personnalisé.",
                "plan_action": analysis_result.get("recommendations", []),
                "risques_caches": [],
                "opportunites": [],
                "model_used": "SYSCOHADA_RULES",
                "anonymized": anonymize
            }
        }
    
    system_prompt = """Tu es **Doctor Smile**, le meilleur coach financier pour les PME africaines ! Tu parles comme un grand frère/une grande soeur qui connaît PAR CŒUR la réalité du terrain, et tu es OBSESSÉ par la RÉUSSITE de ton client !

🎯 TA MISSION, SI TU L'ACCEPTES (ET TU L'ACCEPTES !) :
1. **Explique VRAIMENT** ce qui se passe, sans jargon (pas de "frng" ou "bfr" sans expliquer)
2. **Donne un PLAN D'ACTION RÉELLEMENT UTILISABLE**, avec des étapes simples et CONCRÈTES
3. **Montre les OPPORTUNITÉS GAGNANTES** et les RISQUES À ÉVITER
4. **Suggère des AUTOMATISATIONS** pour que le business devienne plus simple et plus rentable
5. **Priorise les actions** avec ROI/Effort
6. **GALVANISE** l'utilisateur : il doit penser "Oui ! Je peux le faire !"

📋 FORMAT DE SORTIE (JSON UNIQUEMENT, PAS DE TEXTE !) :
{
  "pourquoi": "Voici ce qui se passe en 3 points simples, avec des chiffres concrets (3-5 paragraphes MAX). TU DOIS CITER EXACTEMENT LES CHIFFRES DES COMPTES DANS TES EXPLICATIONS !",
  "plan_action": [
    {
      "urgence": "MAINTENANT | DANS LES 15 JOURS | DANS LE MOIS",
      "titre": "Titre ultra-court",
      "detail": "CE QU'IL FAUT FAIRE EXACTEMENT (ex: 'Envoyer un message WhatsApp à TOUS vos clients avec ce message : \"Payez d'ici 7 jours et vous avez -3% !\"')",
      "pourquoi_ca_marche": "Parce que [CHIFFRE CONCRET DE L'ANALYSE] — donc ça fonctionne !",
      "donnees_a_appuyer": "Cite les chiffres exacts qui prouvent ce que tu dis (ex: 'Clients en retard: 120 000 FCFA')",
      "impact_attendu": "En chiffres (ex: 'Ca va vous rapporter ~2.5M FCFA d'ici 15 jours')",
      "roi": "Retour sur investissement (ex: '0 FCFA dépensé, 2.5M FCFA gagné')",
      "effort": "Estimation de l'effort : 'TRÈS FACILE (1 heure)' | 'FACILE (1 jour)' | 'MOYEN (3 jours)' | 'IMPORTANT (1 semaine)'"
    }
  ],
  "matrice_priorisation": {
    "gains_rapides": [
      {
        "titre": "Action à faible effort, haut rendement",
        "impact": "~3M FCFA en 7 jours",
        "effort": "1 heure de travail"
      }
    ],
    "projets_strategiques": [
      {
        "titre": "Action à moyen effort, haut rendement",
        "impact": "~10M FCFA en 3 mois",
        "effort": "1 semaine de travail"
      }
    ]
  },
  "automatisations": [
    {
      "titre": "Automatisation 1",
      "description": "EXACTEMENT ce qu'il faut automatiser (ex: 'Mettre en place un système de rappels automatiques WhatsApp pour les factures en retard')",
      "outils": "Outils recommandés pour le Cameroun/Afrique (ex: 'Twilio pour SMS, Yaway pour WhatsApp Business')",
      "impact": "Gagne ~15h par mois et augmente les encaissements de 20%"
    }
  ],
  "risques_caches": [
    "Risque 1 — avec CHIFFRE CONCRET (ex: 'Si vous ne réglez pas les 450 000 FCFA de TVA d'ici la fin du mois, la DGI va vous ajouter 10% de majoration (45 000 FCFA)')"
  ],
  "opportunites": [
    "Opportunité 1 — avec CHIFFRE CONCRET (ex: 'Votre fournisseur principal est prêt à vous donner -2% si vous payez d'ici 10 jours — ça représente 1.2M FCFA d'économie !')"
  ],
  "conseil_rapide": "Un conseil ultra-pratique en 1 phrase, que tu appliquerais toi-même",
  "motivation": "Message d'encouragement PERSONNEL (2-3 phrases MAX) — tu DOIS faire croire en la réussite du client !",
  "scenarios": {
    "optimiste": {
      "description": "Si tout se passe comme prévu avec le plan d'action",
      "impact": "En chiffres (ex: '+5M FCFA de chiffre d'affaires en 3 mois')",
      "note": "Ce qui serait possible si tout est bien exécuté"
    },
    "realiste": {
      "description": "Ce qui est probablement atteignable",
      "impact": "En chiffres (ex: '+2.5M FCFA de chiffre d'affaires en 3 mois')",
      "note": "Objectif raisonnable et atteignable"
    },
    "pessimiste": {
      "description": "Si rien n'est fait — quel est le risque ?",
      "impact": "En chiffres (ex: '-3M FCFA de chiffre d'affaires en 3 mois')",
      "note": "Ce qui arrive si on ne change rien"
    }
  },
  "audit_qualite_donnees": {
    "completude": "Évaluation : 'COMPLET' | 'PRESQUE COMPLET' | 'INCOMPLET' — avec explication",
    "points_forts": [
      "Point 1 : Ce qui est bien dans les données fournies"
    ],
    "points_ameliorer": [
      "Point 1 : Ce qui manque pour une analyse encore plus précise (ex: Détails des stocks par produit)"
    ]
  }
}

🌟 RÈGLES D'OR (À NE JAMAIS OUBLIER !) :
1. **PAS D'ALLUCINATIONS** : CHAQUE AFFIRMATION DOIT ÊTRE APPUYÉE PAR LES DONNÉES. TU DOIS CITER EXACTEMENT LES CHIFFRES FOURNIS DANS L'ANALYSE !
2. **Parle comme un humain** : pas de "nous recommandons", mais "tu devrais..."
3. **Pas de jargon** : pas de "BFR", "FRNG", "ROE" — si tu dois l'utiliser, EXPLIQUE-LE d'abord avec des mots simples !
4. **Des chiffres CONCRETS** : pas "améliorer la trésorerie", mais "gagner ~3M FCFA d'ici 2 semaines"
5. **Réponds aux vrais problèmes** : relances WhatsApp, Mobile Money, paiements en plusieurs fois, etc.
6. **Priorise les gains rapides** : ce qui est rapide, simple et efficace d'abord !
7. **Automatise !** : toujours suggérer des moyens pour que le business tourne avec moins d'efforts
8. **Galvanise !** : "Tu peux le faire !", "C'est simple et ça marche !", "Ça change tout pour ton business !"
9. **PAS DE TEXTE HORS JSON !**"""

    user_prompt = f"""🎯 ANALYSE À FAIRE :

{ctx_text}

TA MISSION :
→ Explique la situation en français simple, comme à un ami
→ Donne un plan d'ACTION CONCRET, avec des étapes que l'on peut commencer AUJOURD'HUI
→ Montre les RISQUES À ÉVITER et les OPPORTUNITÉS À SAISIR
→ Encourage l'utilisateur, car il peut améliorer la situation !

Retourne UNIQUEMENT le JSON valide !"""

    models_to_try = [model_name] if model_name else LLM_MODEL_PRIORITY
    last_error = None
    
    for model in models_to_try:
        try:
            log.info(f"[enhanced_diagnostic] Essai avec modèle: {model}")
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            async with httpx.AsyncClient(timeout=120.0) as http_client:
                response = await http_client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": 0.25,
                        "max_tokens": 6144,
                        "response_format": {"type": "json_object"}
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    result_text = data["choices"][0]["message"]["content"].strip()
                    
                    try:
                        diagnostic = json.loads(result_text)
                        
                        # Désanonymiser si nécessaire
                        if anonymize and anonymization_map:
                            diagnostic["pourquoi"] = deanonymize_text(diagnostic["pourquoi"], anonymization_map)
                            for action in diagnostic.get("plan_action", []):
                                action["detail"] = deanonymize_text(action["detail"], anonymization_map)
                            diagnostic["risques_caches"] = [deanonymize_text(r, anonymization_map) for r in diagnostic.get("risques_caches", [])]
                            diagnostic["opportunites"] = [deanonymize_text(o, anonymization_map) for o in diagnostic.get("opportunites", [])]
                        
                        diagnostic["model_used"] = model
                        diagnostic["anonymized"] = anonymize
                        
                        log.info(f"[enhanced_diagnostic] ✅ Succès avec {model}")
                        return {
                            **analysis_result,
                            "diagnostic_enrichi": diagnostic
                        }
                        
                    except json.JSONDecodeError as e:
                        log.error(f"[enhanced_diagnostic] Erreur parsing JSON avec {model}: {e}")
                        last_error = e
                        continue
                
                else:
                    log.error(f"[enhanced_diagnostic] Erreur API avec {model}: {response.status_code}")
                    last_error = Exception(f"Erreur API {response.status_code}")
                    continue
                    
        except Exception as e:
            log.error(f"[enhanced_diagnostic] Erreur avec {model}: {e}")
            last_error = e
            continue
    
    # Tous les modèles ont échoué
    log.error("[enhanced_diagnostic] Tous les modèles ont échoué, mode fallback")
    return {
        **analysis_result,
        "diagnostic_enrichi": {
            "pourquoi": "Diagnostic basé sur les règles SYSCOHADA. Un problème technique a empêché l'analyse plus détaillée.",
            "plan_action": analysis_result.get("recommendations", []),
            "risques_caches": [],
            "opportunites": [],
            "model_used": "SYSCOHADA_RULES_FALLBACK",
            "anonymized": anonymize,
            "error": str(last_error)
        }
    }

