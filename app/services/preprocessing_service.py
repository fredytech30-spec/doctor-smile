
"""
==========================================
PREPROCESSING SERVICE - v3 (aligned model)
DOCTOR SMILE
==========================================
"""

from __future__ import annotations

import logging
import os
from typing import Any

import joblib
import numpy  as np
import pandas as pd
from sklearn.impute       import SimpleImputer
from sklearn.preprocessing import LabelEncoder, StandardScaler

log = logging.getLogger("doctorsmile.preprocessing")

# ==============================================
#  COLUMN ALIASES (FR / EN to internal key)
# ==============================================

COL_ALIASES: dict[str, str] = {
    # LiquiditÃ© brute
    "actif_courant":              "actif_courant",
    "current_assets":             "actif_courant",
    "passif_courant":             "passif_courant",
    "current_liabilities":        "passif_courant",
    "tresorerie":                 "tresorerie",
    "cash":                       "tresorerie",
    "stocks":                     "stocks",
    "inventory":                  "stocks",

    # Compte de rÃ©sultat
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
#  FEATURES - ALIGNED WITH TRAINING DATASET
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

CAT_FEATURES: list[str] = ["secteur_enc", "taille_enc", "pays_enc"]
ALL_FEATURES: list[str] = NUMERIC_FEATURES + CAT_FEATURES

# Known categories
SECTEURS = ["Tech", "Industrie", "Retail", "Immobilier", "Sante",
            "Finance", "Agro", "Transport", "Energie", "Media", "Autre"]
TAILLES  = ["Micro", "PME", "ETI", "Grand Groupe"]
PAYS = [
    "France", "Belgique", "Suisse", "Luxembourg",
    "Maroc", "Tunisie", "Algerie",
    "Senegal", "Cote d'Ivoire", "Cameroun", "Congo", "Gabon",
    "Mali", "Burkina Faso", "Madagascar",
    "Canada", "Autre",
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
#  MAIN CLASS
# ==============================================

class PreprocessingService:
    """
    Preprocessing pipeline for Doctor Smile.
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
        self.scaler:            StandardScaler  = StandardScaler()
        self.encoders:          dict[str, LabelEncoder] = self._init_encoders()
        self.imputer:           SimpleImputer | None    = None
        self.is_scaler_fitted:  bool = False
        self._ready = True

    # ==============================================
    #  ENTRY POINT
    # ==============================================

    def preprocess(
        self,
        rows: list[dict[str, Any]],
    ) -> tuple[np.ndarray, list[str]]:
        """
        Transform raw rows into NumPy matrix ready for ML.
        Returns (X, feature_names).
        """
        agg      = self._normalize_and_aggregate(rows)
        features = self._compute_numeric_features(agg)
        cat_feat = self._encode_categoricals(agg)

        # Impute NaN with reference medians
        for key in NUMERIC_FEATURES:
            v = features.get(key, np.nan)
            if v is None or (isinstance(v, float) and np.isnan(v)):
                features[key] = MEDIANS_REFERENCE.get(key, 0.0)

        # Winsorization
        features = self._winsorize(features)

        # Final vector
        num_vec = np.array([features[k] for k in NUMERIC_FEATURES], dtype=float)
        cat_vec = np.array([cat_feat[k]  for k in CAT_FEATURES],    dtype=float)
        X_raw   = np.concatenate([num_vec, cat_vec]).reshape(1, -1)

        # Replace residual NaN
        X_raw = np.nan_to_num(X_raw, nan=0.0)

        # Normalization with automatic scaler/features alignment
        if self.is_scaler_fitted:
            n_expected = self.scaler.n_features_in_
            n_actual   = X_raw.shape[1]

            if n_actual != n_expected:
                log.warning(
                    "Scaler mismatch: X has %d features, scaler expects %d. "
                    "Automatic alignment enabled.",
                    n_actual, n_expected,
                )

                if hasattr(self.scaler, "feature_names_in_"):
                    import pandas as _pd
                    scaler_features = list(self.scaler.feature_names_in_)
                    df_cur = _pd.DataFrame(X_raw, columns=ALL_FEATURES)
                    for col in scaler_features:
                        if col not in df_cur.columns:
                            df_cur[col] = 0.0
                    X_raw = df_cur[scaler_features].values.astype(float)
                    active_features = scaler_features
                    log.info("Aligned by names: %d -> %d features",
                             n_actual, len(scaler_features))

                elif n_actual > n_expected:
                    new_feat_candidates = ["retained_earnings_ta"]
                    for candidate in new_feat_candidates:
                        if candidate in ALL_FEATURES and n_actual - 1 == n_expected:
                            idx = ALL_FEATURES.index(candidate)
                            X_raw = np.delete(X_raw, idx, axis=1)
                            active_features = [f for f in ALL_FEATURES if f != candidate]
                            log.info("Removed '%s': %d -> %d features",
                                     candidate, n_actual, X_raw.shape[1])
                            break
                    else:
                        X_raw = X_raw[:, :n_expected]
                        active_features = ALL_FEATURES[:n_expected]
                        log.warning("Truncated X_raw: %d -> %d features",
                                    n_actual, n_expected)

                else:
                    pad = np.zeros((1, n_expected - n_actual))
                    X_raw = np.concatenate([X_raw, pad], axis=1)
                    active_features = ALL_FEATURES + [
                        f"__pad_{i}" for i in range(n_expected - n_actual)
                    ]
                    log.warning("Padded X_raw: %d -> %d features",
                                n_actual, n_expected)
            else:
                active_features = ALL_FEATURES

            X = self.scaler.transform(X_raw)
            return X, active_features

        else:
            X = self._manual_normalize(X_raw)
            return X, ALL_FEATURES

    # ==============================================
    #  STEP 1 - Normalization + aggregation
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
    #  STEP 2 - Calculate ratios
    # ==============================================

    def _compute_numeric_features(
        self, d: dict[str, Any]
    ) -> dict[str, float]:
        def g(k, default=np.nan):
            v = d.get(k, default)
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
    #  STEP 3 - Encode categoricals
    # ==============================================

    def _encode_categoricals(
        self, d: dict[str, Any]
    ) -> dict[str, float]:
        result: dict[str, float] = {}
        for col in ("secteur", "taille", "pays"):
            enc   = self.encoders[col]
            raw   = str(d.get(col, "")).strip()
            known = set(enc.classes_)
            val   = raw if raw in known else enc.classes_[0]
            result[f"{col}_enc"] = float(enc.transform([val])[0])
        return result

    # ==============================================
    #  STEP 5 - Winsorization
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

    # ==============================================
    #  Manual normalization (fallback without scaler)
    # ==============================================

    _STD_REFERENCE: dict[str, float] = {
        "current_ratio":        0.56,
        "quick_ratio":          0.42,
        "cash_ratio":           0.18,
        "debt_equity":          2.77,
        "solvabilite":          0.268,
        "roa":                  9.94,
        "roe":                 34.5,
        "ebitda_margin":       14.2,
        "net_margin":          13.0,
        "marge_brute_pct":     16.5,
        "rotation_actifs":      0.39,
        "bfr_ca":              0.186,
        "couverture_interets":  0.308,
        "annees_activite":      8.40,
        "altman_z":             3.5,
        "retained_earnings_ta": 2.07,
        "pct_missing":          0.3,
        "secteur_enc":          3.0,
        "taille_enc":           1.0,
        "pays_enc":             2.5,
    }

    def _manual_normalize(self, X_raw: np.ndarray) -> np.ndarray:
        medians = np.array(
            [MEDIANS_REFERENCE.get(k, 0.0) for k in NUMERIC_FEATURES]
            + [3.0, 1.0, 2.0],
            dtype=float,
        )
        stds = np.array(
            [self._STD_REFERENCE.get(k, 1.0) for k in ALL_FEATURES],
            dtype=float,
        )
        stds[stds == 0] = 1.0
        return (X_raw - medians) / stds

    # ==============================================
    #  Save / Load
    # ==============================================

    def save(self, path: str) -> None:
        os.makedirs(path, exist_ok=True)
        joblib.dump(self.scaler,   f"{path}/scaler.pkl")
        joblib.dump(self.encoders, f"{path}/encoders.pkl")
        log.info("Preprocessing saved to %s", path)

    def load(self, path: str) -> None:
        self.scaler          = joblib.load(f"{path}/scaler.pkl")
        self.encoders        = joblib.load(f"{path}/encoders.pkl")
        self.is_scaler_fitted = True
        imp_path = f"{path}/imputer.pkl"
        if os.path.exists(imp_path):
            self.imputer = joblib.load(imp_path)
        log.info("Preprocessing loaded from %s", path)

    # ==============================================
    #  Helpers
    # ==============================================

    @staticmethod
    def _init_encoders() -> dict[str, LabelEncoder]:
        enc_s = LabelEncoder(); enc_s.fit(SECTEURS)
        enc_t = LabelEncoder(); enc_t.fit(TAILLES)
        enc_p = LabelEncoder(); enc_p.fit(PAYS)
        return {"secteur": enc_s, "taille": enc_t, "pays": enc_p}


preprocessing_service = PreprocessingService()

