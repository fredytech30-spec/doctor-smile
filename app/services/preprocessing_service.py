
import logging
from typing import Any

import numpy as np

log = logging.getLogger("doctorsmile.preprocessing")

# ==============================================
#  COLUMN ALIASES (FR / EN to internal key)
# ==============================================

COL_ALIASES: dict[str, str] = {
    # Liquidité brute
    "actif_courant":              "actif_courant",
    "current_assets":             "actif_courant",
    "passif_courant":             "passif_courant",
    "current_liabilities":        "passif_courant",
    "tresorerie":                 "tresorerie",
    "cash":                       "tresorerie",
    "stocks":                     "stocks",
    "inventory":                  "stocks",

    # Compte de résultat
    "chiffre_affaires":           "chiffre_affaires",
    "revenue":                    "chiffre_affaires",
    "ca":                         "chiffre_affaires",
    "resultat_net":               "resultat_net",
    "net_income":                 "resultat_net",
    "benefice_net":               "resultat_net",
    "ebitda":                     "ebitda",
    "excedent_brut":              "ebitda",
    "marge_brute":                "marge_brute",
    "gross_profit":               "marge_brute",
    "charges_financieres":        "charges_financieres",
    "interest_expense":           "charges_financieres",
    "resultat_exploitation":      "resultat_exploitation",
    "operating_income":           "resultat_exploitation",
    "ebit":                       "resultat_exploitation",
    "resultats_reportes":         "resultats_reportes",
    "retained_earnings":          "resultats_reportes",

    # Bilan
    "actif_total":                "actif_total",
    "total_assets":               "actif_total",
    "capitaux_propres":           "capitaux_propres",
    "equity":                     "capitaux_propres",
    "fonds_propres":              "capitaux_propres",
    "dettes_totales":             "dettes_totales",
    "total_debt":                 "dettes_totales",
    "dettes_financieres":         "dettes_totales",
    "dettes_lt":                  "dettes_lt",
    "long_term_debt":             "dettes_lt",

    # BFR
    "bfr":                        "bfr",
    "working_capital":            "bfr",
    "creances_clients":           "creances_clients",
    "accounts_receivable":        "creances_clients",
    "dettes_fournisseurs":        "dettes_fournisseurs",
    "accounts_payable":           "dettes_fournisseurs",

    # Already calculated ratios (direct pass-through)
    "current_ratio":              "current_ratio",
    "liquidite_generale":         "current_ratio",
    "quick_ratio":                "quick_ratio",
    "liquidite_immediate":        "quick_ratio",
    "cash_ratio":                 "cash_ratio",
    "ratio_tresorerie":           "cash_ratio",
    "debt_equity":                "debt_equity",
    "ratio_endettement":          "debt_equity",
    "solvabilite":                "solvabilite",
    "roa":                        "roa",
    "roe":                        "roe",
    "ebitda_margin":              "ebitda_margin",
    "net_margin":                 "net_margin",
    "marge_nette":                "net_margin",
    "marge_brute_pct":            "marge_brute_pct",
    "rotation_actifs":            "rotation_actifs",
    "bfr_ca":                     "bfr_ca",
    "couverture_interets":        "couverture_interets",
    "altman_z":                   "altman_z",
    "retained_earnings_ta":       "retained_earnings_ta",

    # Categoricals
    "secteur":                    "secteur",
    "sector":                     "secteur",
    "taille":                     "taille",
    "company_size":               "taille",
    "size":                       "taille",
    "pays":                       "pays",
    "country":                    "pays",

    # Meta
    "annees_activite":            "annees_activite",
    "years_active":               "annees_activite",
    "age_entreprise":             "annees_activite",
    "effectif":                   "effectif",
    "employees":                  "effectif",
}

# ==============================================
#  FEATURES (for reference only now)
# ==============================================

NUMERIC_FEATURES: list[str] = [
    "current_ratio",
    "quick_ratio",
    "cash_ratio",
    "debt_equity",
    "solvabilite",
    "roa",
    "roe",
    "ebitda_margin",
    "net_margin",
    "marge_brute_pct",
    "rotation_actifs",
    "bfr_ca",
    "couverture_interets",
    "annees_activite",
    "altman_z",
    "retained_earnings_ta",
    "pct_missing",
]

# Reference medians calibrated on real dataset
MEDIANS_REFERENCE: dict[str, float] = {
    "current_ratio":        1.20,
    "quick_ratio":          0.80,
    "cash_ratio":           0.15,
    "debt_equity":          1.55,
    "solvabilite":          0.268,
    "roa":                  2.17,
    "roe":                  5.45,
    "ebitda_margin":        6.64,
    "net_margin":           2.35,
    "marge_brute_pct":     20.59,
    "rotation_actifs":      0.68,
    "bfr_ca":               0.056,
    "couverture_interets":  0.308,
    "annees_activite":      9.65,
    "altman_z":             1.85,
    "retained_earnings_ta": 1.18,
    "pct_missing":          0.0,
}


# ==============================================
#  MAIN CLASS (simplified for non-ML use)
# ==============================================

class PreprocessingService:
    """
    Simplified preprocessing pipeline for Doctor Smile (no ML anymore).
    Singleton - loaded once at server startup.
    """

    _instance: "PreprocessingService | None" = None

    def __new__(cls) -> "PreprocessingService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._ready = False
        return cls._instance

    def __init__(self) -> None:
        if self._ready:
            return
        self._ready = True

    # ==============================================
    #  Normalization + aggregation
    # ==============================================

    def _normalize_and_aggregate(
        self, rows: list[dict[str, Any]]
    ) -> dict[str, float | str]:
        agg_num: dict[str, float] = {}
        agg_cat: dict[str, str]   = {}

        for row in rows:
            for raw_key, raw_val in row.items():
                key = self._normalize_key(raw_key)

                if key in ("secteur", "taille", "pays"):
                    if key not in agg_cat and raw_val:
                        agg_cat[key] = str(raw_val).strip()
                    continue

                try:
                    val = float(
                        str(raw_val)
                        .replace(",", ".")
                        .replace(" ", "")
                        .replace("%", "")
                        .replace("k", "e3")
                        .replace("K", "e3")
                        .replace("M", "e6")
                        or "0"
                    )
                    if not np.isfinite(val):
                        continue
                    if key in NUMERIC_FEATURES and key not in agg_num:
                        agg_num[key] = val
                    elif key not in NUMERIC_FEATURES:
                        agg_num[key] = agg_num.get(key, 0.0) + val

                except (ValueError, TypeError):
                    pass

        return {**agg_num, **agg_cat}

    @staticmethod
    def _normalize_key(raw_key: str) -> str:
        import unicodedata
        k = str(raw_key).lower().strip()
        k = unicodedata.normalize("NFD", k)
        k = "".join(c for c in k if unicodedata.category(c) != "Mn")
        k = k.replace(" ", "_").replace("'", "_").replace("-", "_")
        return COL_ALIASES.get(k, k)

    # ==============================================
    #  Calculate ratios
    # ==============================================

    def _compute_numeric_features(
        self, d: dict[str, Any]
    ) -> dict[str, float]:
        def g(key, default=np.nan):
            v = d.get(key, default)
            if v is None:
                return default
            try:
                f = float(v)
                return f if np.isfinite(f) else default
            except (TypeError, ValueError):
                return default

        def safe_div(a, b, default=np.nan):
            try:
                fa, fb = float(a), float(b)
                return fa / fb if fb != 0 and np.isfinite(fa) and np.isfinite(fb) else default
            except (TypeError, ValueError):
                return default

        actif_c  = g("actif_courant",       0.0)
        passif_c = g("passif_courant",       0.0)
        treso    = g("tresorerie",           0.0)
        stocks   = g("stocks",               0.0)
        actif_t  = g("actif_total",          0.0)
        capitaux = g("capitaux_propres",     0.0)
        dettes   = g("dettes_totales",       0.0)
        ca       = g("chiffre_affaires",     0.0)
        res_net  = g("resultat_net",         0.0)
        ebitda_v = g("ebitda",               0.0)
        marge_b  = g("marge_brute",          0.0)
        charges  = g("charges_financieres",  0.0)
        res_exp  = g("resultat_exploitation",0.0)
        bfr_v    = g("bfr",                  np.nan)
        retained = g("resultats_reportes",   0.0)
        annees   = g("annees_activite",      np.nan)

        def ratio_or_calc(key, calc_val):
            direct = d.get(key, np.nan)
            if direct is not None and np.isfinite(float(direct if direct else np.nan)):
                return float(direct)
            return calc_val

        cr_calc = safe_div(actif_c, passif_c)
        qr_calc = safe_div(actif_c - stocks, passif_c)
        cash_calc = safe_div(treso, passif_c)
        current_ratio = ratio_or_calc("current_ratio", cr_calc)
        quick_ratio   = ratio_or_calc("quick_ratio",   qr_calc)
        cash_ratio    = ratio_or_calc("cash_ratio",    cash_calc)

        de_calc  = safe_div(dettes, capitaux)
        sol_calc = safe_div(capitaux, actif_t) if actif_t else np.nan
        debt_equity = ratio_or_calc("debt_equity", de_calc)
        solvabilite = ratio_or_calc("solvabilite", sol_calc)

        roa_calc    = safe_div(res_net, actif_t)  * 100 if actif_t else np.nan
        roe_calc    = safe_div(res_net, capitaux) * 100 if capitaux else np.nan
        ebitda_calc = safe_div(ebitda_v, ca)      * 100 if ca else np.nan
        net_m_calc  = safe_div(res_net, ca)       * 100 if ca else np.nan
        marge_b_calc= safe_div(marge_b, ca)       * 100 if ca else np.nan
        roa          = ratio_or_calc("roa",          roa_calc)
        roe          = ratio_or_calc("roe",          roe_calc)
        ebitda_margin= ratio_or_calc("ebitda_margin",ebitda_calc)
        net_margin   = ratio_or_calc("net_margin",   net_m_calc)
        marge_brute_pct = ratio_or_calc("marge_brute_pct", marge_b_calc)

        rot_calc   = safe_div(ca, actif_t)  if actif_t else np.nan
        rotation_actifs = ratio_or_calc("rotation_actifs", rot_calc)

        if not np.isnan(g("bfr_ca", np.nan)):
            bfr_ca = g("bfr_ca")
        elif not np.isnan(bfr_v) and ca:
            bfr_ca = safe_div(bfr_v, actif_t) if actif_t else safe_div(bfr_v, ca)
        elif passif_c and actif_t:
            bfr_ca = safe_div(actif_c - passif_c, actif_t)
        else:
            bfr_ca = np.nan

        cov_calc = safe_div(charges, res_exp)
        couverture_interets = ratio_or_calc("couverture_interets", cov_calc)

        annees_activite = annees

        ret_calc = safe_div(retained, actif_t)
        retained_ta = ratio_or_calc("retained_earnings_ta", ret_calc)

        if g("altman_z", np.nan) is not np.nan and np.isfinite(g("altman_z", np.nan)):
            altman_z = g("altman_z")
        else:
            x1 = safe_div(actif_c - passif_c, actif_t, 0.0) if actif_t else 0
            x2 = safe_div(retained, actif_t, 0.0) if actif_t else 0
            x3 = safe_div(res_exp, actif_t, 0.0)  if actif_t else 0
            x4 = safe_div(capitaux, max(dettes, 1e-6), 0.0) if dettes else 0
            x5 = safe_div(ca, actif_t, 0.0) if actif_t else 0
            altman_z = 1.2*x1 + 1.4*x2 + 3.3*x3 + 0.6*x4 + 1.0*x5

        input_keys = set(d.keys()) & set(COL_ALIASES.values())
        pct_missing = max(0.0, min(1.0, 1.0 - len(input_keys) / len(NUMERIC_FEATURES)))

        return {
            "current_ratio":        current_ratio,
            "quick_ratio":          quick_ratio,
            "cash_ratio":           cash_ratio,
            "debt_equity":          debt_equity,
            "solvabilite":          solvabilite,
            "roa":                  roa,
            "roe":                  roe,
            "ebitda_margin":        ebitda_margin,
            "net_margin":           net_margin,
            "marge_brute_pct":      marge_brute_pct,
            "rotation_actifs":      rotation_actifs,
            "bfr_ca":               bfr_ca,
            "couverture_interets":  couverture_interets,
            "annees_activite":      annees_activite,
            "altman_z":             altman_z,
            "retained_earnings_ta": retained_ta,
            "pct_missing":          pct_missing,
        }

    # ==============================================
    #  Winsorization
    # ==============================================

    _WINSOR_BOUNDS: dict[str, tuple[float, float]] = {
        "current_ratio":        (0.10,  3.27),
        "quick_ratio":          (0.05,  2.20),
        "cash_ratio":           (0.00,  0.84),
        "debt_equity":          (0.10, 18.00),
        "solvabilite":          (-0.131, 0.75),
        "roa":                  (-40.9, 15.8),
        "roe":                  (-170.4,31.6),
        "ebitda_margin":        (-48.9, 34.5),
        "net_margin":           (-59.3, 15.3),
        "marge_brute_pct":      (-15.0, 67.2),
        "rotation_actifs":      (0.05,  2.08),
        "bfr_ca":               (-0.584, 0.40),
        "couverture_interets":  (0.03,  0.99),
        "altman_z":             (-8.0,  12.0),
        "retained_earnings_ta": (-5.6,   5.5),
        "annees_activite":      (1.0,   48.8),
    }

    def _winsorize(
        self, features: dict[str, float]
    ) -> dict[str, float]:
        out = features.copy()
        for key, (lo, hi) in self._WINSOR_BOUNDS.items():
            v = out.get(key, np.nan)
            if v is not None and np.isfinite(v):
                out[key] = max(lo, min(hi, v))
        return out


preprocessing_service = PreprocessingService()

