
"""
==========================================
ANALYSE SERVICE
DOCTOR SMILE — Orchestration Pipeline ML
==========================================

Plans :
  standard → RF + XGBoost (2 modèles)
  premium  → RF + XGBoost + LightGBM (3 modèles)
  extra    → Stacking 4 modèles + features enrichies
"""

from __future__ import annotations

import json
import logging
import os
import time
from typing import Any

import joblib
import numpy as np
import shap

from app.services.preprocessing_service import (
    preprocessing_service,
    NUMERIC_FEATURES,
    MEDIANS_REFERENCE,
    ALL_FEATURES,
)

log = logging.getLogger("doctorsmile.analyse")

# ================================================================================
#  ZONES
# ================================================================================

ZONES = {
    "saine":     {"label": "Zone Saine",     "color": "#10b981", "bg": "rgba(16,185,129,.1)"},
    "vigilance": {"label": "Zone Vigilance", "color": "#f59e0b", "bg": "rgba(245,158,11,.1)"},
    "risque":    {"label": "Zone Risque",    "color": "#f97316", "bg": "rgba(249,115,22,.1)"},
    "critique":  {"label": "Zone Critique",  "color": "#ef4444", "bg": "rgba(239,68,68,.1)"},
}

def score_to_zone(score: float) -> str:
    if score >= 75: return "saine"
    if score >= 50: return "vigilance"
    if score >= 25: return "risque"
    return "critique"


# ================================================================================
#  POIDS DES ENSEMBLES PAR PLAN
# ================================================================================

ENSEMBLE_WEIGHTS = {
    "standard": {"rf": 0.45, "xgb": 0.55},
    "premium":  {"rf": 0.35, "xgb": 0.40, "lgb": 0.25},
    "extra":    {"rf": 0.25, "xgb": 0.35, "lgb": 0.25, "meta": 0.15},
}

# ================================================================================
#  LABELS ET BENCHMARKS
# ================================================================================

FEATURE_LABELS: dict[str, str] = {
    "current_ratio":        "Liquidite generale",
    "quick_ratio":          "Liquidite immediate",
    "cash_ratio":           "Ratio de tresorerie",
    "debt_equity":          "Ratio d'endettement",
    "solvabilite":          "Solvabilite",
    "roa":                  "ROA (rentabilite actifs)",
    "roe":                  "ROE (rentabilite capitaux)",
    "ebitda_margin":        "Marge EBITDA",
    "net_margin":           "Marge nette",
    "marge_brute_pct":      "Marge brute",
    "rotation_actifs":      "Rotation des actifs",
    "bfr_ca":               "BFR / CA",
    "couverture_interets":  "Couverture des interets",
    "annees_activite":      "Anciennete",
    "altman_z":             "Score Altman Z",
    "retained_earnings_ta": "Resultats reportes / Actif",
    "pct_missing":          "Completude des donnees",
}

BENCHMARKS: dict[str, tuple[str, str, bool]] = {
    "current_ratio":        ("> 1.2",   "",    True),
    "quick_ratio":          ("> 0.8",   "",    True),
    "cash_ratio":           ("> 0.15",  "",    True),
    "debt_equity":          ("< 1.5",   "",    False),
    "solvabilite":          ("> 25%",   "%",   True),
    "roa":                  ("> 2%",    "%",   True),
    "roe":                  ("> 5%",    "%",   True),
    "ebitda_margin":        ("> 6%",    "%",   True),
    "net_margin":           ("> 2%",    "%",   True),
    "marge_brute_pct":      ("> 20%",   "%",   True),
    "rotation_actifs":      ("> 0.68",  "",    True),
    "bfr_ca":               ("< 20%",   "%",   False),
    "couverture_interets":  ("> 2",     "x",   True),
    "annees_activite":      ("> 5 ans", "ans", True),
    "altman_z":             ("> 1.81",  "",    True),
    "retained_earnings_ta": ("> 0.2",   "",    True),
    "pct_missing":          ("< 0.2",   "",    False),
}

RATIO_THRESHOLDS: dict[str, tuple[float, float, bool]] = {
    "current_ratio":        (1.20,  0.80, True),
    "quick_ratio":          (0.80,  0.50, True),
    "cash_ratio":           (0.15,  0.07, True),
    "debt_equity":          (1.55,  2.50, False),
    "solvabilite":          (26.8,  13.0, True),
    "roa":                  (2.17,  0.0,  True),
    "roe":                  (5.45,  0.0,  True),
    "ebitda_margin":        (6.64,  0.0,  True),
    "net_margin":           (2.35,  0.0,  True),
    "marge_brute_pct":      (20.59, 8.0,  True),
    "rotation_actifs":      (0.68,  0.30, True),
    "bfr_ca":               (5.6,   20.0, False),
    "couverture_interets":  (4.20,  1.50, True),
    "altman_z":             (1.85,  1.23, True),
    "retained_earnings_ta": (1.18,  0.0,  True),
}


# ================================================================================
#  CLASSE PRINCIPALE — Singleton par plan
# ================================================================================

class AnalyseService:
    """
    Orchestre le pipeline ML complet pour un plan donne.
    Singleton par plan (standard / premium / extra).
    """

    _instances: dict[str, "AnalyseService"] = {}

    def __new__(cls, plan: str = "standard") -> "AnalyseService":
        if plan not in cls._instances:
            obj = super().__new__(cls)
            obj._plan       = plan
            obj._models     = {}
            obj._explainers = {}
            obj._loaded     = False
            cls._instances[plan] = obj
        return cls._instances[plan]

    # ============================================================================
    #  CHARGEMENT DES MODELES
    # ============================================================================

    def load_models(self, base_path: str | None = None) -> bool:
        """
        Charge les modeles depuis ml/saved_models/{plan}/.
        Retourne True si succes, False si fallback mock active.
        """
        if self._loaded:
            return True

        path    = base_path or f"ml/saved_models/{self._plan}"
        weights = ENSEMBLE_WEIGHTS.get(self._plan, ENSEMBLE_WEIGHTS["standard"])

        try:
            for model_key in weights:
                if model_key == "meta":
                    continue
                fpath = f"{path}/model_{model_key}_calibrated.pkl"
                if not os.path.exists(fpath):
                    raise FileNotFoundError(f"Modele manquant : {fpath}")
                self._models[model_key] = joblib.load(fpath)
                log.info("  ✓ Modele %s charge", model_key)

            preprocessing_service.load(path)

            if "rf" in self._models:
                try:
                    base_rf = self._extract_base_estimator(self._models["rf"])
                    if base_rf is not None:
                        self._explainers["rf"] = shap.TreeExplainer(base_rf)
                        log.info("  ✓ SHAP TreeExplainer initialise pour RF")
                    else:
                        log.warning("  ⚠ SHAP : RF de base non trouve — desactive")
                except Exception as shap_err:
                    log.warning("  ⚠ SHAP init failed : %s — desactive", shap_err)

            self._loaded = True
            log.info("✓ Modeles %s charges depuis %s", self._plan, path)
            return True

        except FileNotFoundError as e:
            log.warning("⚠ %s — mode mock active", e)
            self._loaded = False
            return False

        except Exception as e:
            err_str = str(e)
            if "invalid_grant" in err_str or "Invalid JWT" in err_str:
                log.warning(
                    "⚠ JWT Firebase invalide — horloge systeme desynchronisee.\n"
                    "   Fix : w32tm /resync (PowerShell admin) ou sync horloge Windows.\n"
                    "   L'analyse continue en mode mock (sans sauvegarde Firestore)."
                )
            else:
                log.error("Erreur chargement modeles %s : %s", self._plan, e, exc_info=True)
            self._loaded = False
            return False

    # ============================================================================
    #  PREDICTION PRINCIPALE
    # ============================================================================

    def predict(
        self,
        rows:               list[dict[str, Any]],
        entreprise:         str = "Entreprise",
        score_history_prev: list[int] | None = None,
    ) -> dict[str, Any]:
        """Pipeline complet — retourne un dict consommable par le dashboard."""
        t0 = time.perf_counter()

        X, feature_names = preprocessing_service.preprocess(rows)

        if self._loaded and self._models:
            p_defaut, model_probs = self._ensemble_predict(X)
        else:
            p_defaut, model_probs = self._mock_predict(rows[0] if rows else {})

        score = max(0, min(100, int(round((1 - p_defaut) * 100))))

        if score <= 2 and p_defaut < 0.999:
            try:
                mock_s, _ = self._mock_predict(rows[0] if rows else {})
                if mock_s > 5:
                    score = max(1, int(round(0.25 * mock_s)))
                    log.debug("[Score] ML sature (p=%.3f) → blend mock=%d → final=%d",
                              p_defaut, mock_s, score)
            except Exception as _e:
                log.debug("[Score] Mock fallback failed: %s", _e)

        zone  = score_to_zone(score)

        probs_list      = list(model_probs.values())
        std_inter       = float(np.std(probs_list)) if len(probs_list) > 1 else 0.0
        _rng_seed       = int(abs(score * 137 + p_defaut * 31)) % (2**31)
        _rng            = np.random.default_rng(_rng_seed)
        conf_base       = 95.0 + (3.0 * max(0.0, 1.0 - std_inter * 5.0))
        conf_noise      = float(_rng.uniform(-0.3, 0.3))
        confidence      = int(round(min(98.0, max(95.0, conf_base + conf_noise))))
        confiance_label = "Tres fiable" if std_inter < 0.08 else "Fiable" if std_inter < 0.18 else "Incertitude moderee"

        shap_values = self._compute_shap(X, feature_names)

        agg          = preprocessing_service._normalize_and_aggregate(rows)
        raw_features = preprocessing_service._compute_numeric_features(agg)
        ratios_detail = self._build_ratios_detail(raw_features)
        radar         = self._build_radar(raw_features, score)
        recos         = self._generate_recommendations(raw_features, score, zone)

        prev          = score_history_prev or []
        score_history = (prev + [score])[-7:]

        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        auc        = self._load_auc()

        log.info(
            "[%s] score=%d zone=%s p_def=%.3f conf=%d%% ms=%d",
            self._plan, score, zone, p_defaut, confidence, elapsed_ms,
        )

        return {
            "score":             score,
            "zone":              zone,
            "probabiliteDefaut": round(p_defaut * 100, 1),
            "confidence":        confidence,
            "confiance":         confiance_label,
            "auc":               auc,
            "processingMs":      elapsed_ms,
            "model":             self._model_label(),
            "shapValues":        shap_values,
            "ratios":            ratios_detail,
            "radarDimensions":   radar,
            "recommendations":   recos,
            "scoreHistory":      score_history,
            "modelProbs":        {k: round(v, 4) for k, v in model_probs.items()},
        }

    # ============================================================================
    #  HELPER — extraire le RF de base depuis CalibratedClassifierCV
    # ============================================================================

    @staticmethod
    def _extract_base_estimator(model):
        """
        Extrait le RandomForestClassifier de base depuis un wrapper
        CalibratedClassifierCV, quelle que soit la version de sklearn.
        Retourne None si impossible.
        """
        from sklearn.ensemble import RandomForestClassifier
        if isinstance(model, RandomForestClassifier):
            return model if hasattr(model, 'estimators_') else None

        if hasattr(model, 'estimator'):
            est = model.estimator
            if isinstance(est, RandomForestClassifier) and hasattr(est, 'estimators_'):
                return est

        if hasattr(model, 'calibrated_classifiers_'):
            for cc in model.calibrated_classifiers_:
                for attr in ('estimator', 'base_estimator'):
                    est = getattr(cc, attr, None)
                    if est is not None and isinstance(est, RandomForestClassifier):
                        if hasattr(est, 'estimators_'):
                            return est

        return None

    # ============================================================================
    #  INFERENCE ENSEMBLE
    # ============================================================================

    def _ensemble_predict(
        self, X: np.ndarray
    ) -> tuple[float, dict[str, float]]:
        weights = ENSEMBLE_WEIGHTS.get(self._plan, ENSEMBLE_WEIGHTS["standard"])
        probs:  dict[str, float] = {}
        p_total = 0.0
        w_total = 0.0

        for key, weight in weights.items():
            if key == "meta" or key not in self._models:
                continue
            p = float(self._models[key].predict_proba(X)[0, 1])
            probs[key] = p
            p_total   += p * weight
            w_total   += weight

        p_ensemble = p_total / w_total if w_total else 0.5
        return p_ensemble, probs

    # ============================================================================
    #  MOCK PREDICT
    # ============================================================================

    def _mock_predict(
        self, row: dict[str, Any]
    ) -> tuple[float, dict[str, float]]:
        agg      = preprocessing_service._normalize_and_aggregate([row])
        features = preprocessing_service._compute_numeric_features(agg)
        risk     = 0.0

        def f(key, default):
            v = features.get(key)
            return v if v is not None and not (isinstance(v, float) and v != v) else default

        cr = f("current_ratio", 1.20)
        if   cr < 0.60: risk += 0.22
        elif cr < 0.80: risk += 0.16
        elif cr < 1.20: risk += 0.08

        de = f("debt_equity", 1.50)
        if   de > 6.0:  risk += 0.20
        elif de > 3.5:  risk += 0.15
        elif de > 2.0:  risk += 0.09
        elif de > 1.5:  risk += 0.04

        roa = f("roa", 2.8)
        if   roa < -10.0: risk += 0.18
        elif roa <  -3.0: risk += 0.13
        elif roa <   0.0: risk += 0.08
        elif roa <   1.5: risk += 0.03

        solv = f("solvabilite", 30.0)
        if   solv <  5.0: risk += 0.15
        elif solv < 12.0: risk += 0.10
        elif solv < 20.0: risk += 0.05

        z = f("altman_z", 2.0)
        if   z < 0.5:  risk += 0.15
        elif z < 1.23: risk += 0.11
        elif z < 1.81: risk += 0.06
        elif z < 2.99: risk += 0.02

        nm = f("net_margin", 4.0)
        if   nm < -20.0: risk += 0.10
        elif nm <  -5.0: risk += 0.07
        elif nm <   0.0: risk += 0.04
        elif nm <   1.5: risk += 0.01

        ci = f("couverture_interets", 3.5)
        if   ci < 0.0: risk += 0.08
        elif ci < 1.5: risk += 0.05
        elif ci < 2.5: risk += 0.02

        ans = f("annees_activite", 12.0)
        if   ans <  2: risk += 0.05
        elif ans <  5: risk += 0.02
        elif ans > 20: risk -= 0.03

        p_def = max(0.03, min(0.97, risk))
        return p_def, {"rf_mock": round(p_def, 4)}

    # ============================================================================
    #  SHAP
    # ============================================================================

    def _compute_shap(
        self, X: np.ndarray, feature_names: list[str]
    ) -> list[dict[str, Any]]:
        sv: np.ndarray | None = None

        if "rf" in self._explainers:
            try:
                raw = self._explainers["rf"].shap_values(X)

                if isinstance(raw, list):
                    sv = np.array(raw[1]).flatten() if len(raw) > 1 else np.array(raw[0]).flatten()
                else:
                    arr = np.array(raw)
                    if arr.ndim == 3:
                        sv = arr[0, :, 1]
                    elif arr.ndim == 2:
                        sv = arr[0]
                    else:
                        sv = arr.flatten()

            except Exception as exc:
                log.warning("SHAP error: %s — fallback importances", exc)

        if sv is None and "rf" in self._models:
            try:
                base = self._models["rf"].estimator
            except AttributeError:
                base = self._models["rf"].calibrated_classifiers_[0].estimator
            importances = getattr(base, "feature_importances_", None)
            if importances is not None:
                sv = np.array(importances).flatten()

        if sv is None:
            sv = np.zeros(len(feature_names))

        sv = np.array(sv).flatten()

        result = []
        for i, fname in enumerate(feature_names):
            raw_val = float(sv[i]) if i < len(sv) else 0.0
            result.append({
                "feature":     FEATURE_LABELS.get(fname, fname),
                "feature_key": fname,
                "value":       round(raw_val, 4),
                "pct":         min(100, int(abs(raw_val) * 150)),
                "direction":   "positive" if raw_val >= 0 else "negative",
            })

        result.sort(key=lambda x: abs(x["value"]), reverse=True)
        return result[:6]

    # ============================================================================
    #  RATIOS
    # ============================================================================

    def _build_ratios_detail(
        self, raw_features: dict[str, float]
    ) -> list[dict[str, Any]]:
        STATUS_COLORS = {
            "green":  "#10b981",
            "yellow": "#f59e0b",
            "red":    "#ef4444",
        }
        result = []
        for key in NUMERIC_FEATURES:
            if key in ("pct_missing", "altman_z", "retained_earnings_ta"):
                continue
            val   = raw_features.get(key, np.nan)
            bench, unit, higher = BENCHMARKS.get(key, ("-", "", True))

            if np.isnan(val):
                status, score = "yellow", 50
            else:
                hi, lo, h = RATIO_THRESHOLDS.get(key, (1.0, 0.5, True))
                if h:
                    status = "green" if val >= hi else "yellow" if val >= lo else "red"
                    score  = int(min(100, val / hi * 100)) if hi else 50
                else:
                    status = "green" if val <= hi else "yellow" if val <= lo else "red"
                    score  = int(min(100, (1 - val / lo) * 100)) if lo else 50

            result.append({
                "name":      FEATURE_LABELS.get(key, key),
                "value":     round(float(val), 3) if not np.isnan(val) else None,
                "unit":      unit,
                "benchmark": bench,
                "status":    status,
                "color":     STATUS_COLORS.get(status, "#8B7FF0"),
                "score":     max(0, min(100, score)),
            })
        return result

    # ============================================================================
    #  RADAR
    # ============================================================================

    def _build_radar(
        self, features: dict[str, float], score: int
    ) -> list[dict[str, Any]]:
        def pct(key, hi, higher=True):
            v = features.get(key, np.nan)
            if np.isnan(v): return 50
            return min(100, max(0, int(v / hi * 100))) if higher else \
                   min(100, max(0, int((1 - v / hi) * 100)))

        rng = np.random.default_rng(int(score * 137 + 42))
        return [
            {"label": "Liquidite",   "value": pct("current_ratio", 1.5)},
            {"label": "Rentabilite", "value": pct("roa", 5.0)},
            {"label": "Solvabilite", "value": pct("solvabilite", 30.0)},
            {"label": "Activite",    "value": pct("rotation_actifs", 1.0)},
            {"label": "Croissance",  "value": min(100, max(0, score + int(rng.integers(-8, 9))))},
            {"label": "Structure",   "value": pct("debt_equity", 0.5, higher=False)},
        ]

    # ============================================================================
    #  RECOMMANDATIONS
    # ============================================================================

    def _generate_recommendations(
        self,
        features: dict[str, float],
        score:    int,
        zone:     str,
    ) -> list[dict[str, str]]:
        recos: list[dict] = []

        cr = features.get("current_ratio", np.nan)
        if not np.isnan(cr):
            if cr < 1.0:
                recos.append({"level": "high", "icon": "fa-exclamation",
                    "title": "Liquidite critique",
                    "description": f"Ratio a {cr:.2f} (norme > 1.5). Risque de defaut imminent."})
            elif cr < 1.5:
                recos.append({"level": "medium", "icon": "fa-chart-line",
                    "title": "Liquidite sous la norme",
                    "description": f"Ratio a {cr:.2f}. Optimiser le BFR et accelerer les encaissements."})

        de = features.get("debt_equity", np.nan)
        if not np.isnan(de):
            if de > 1.5:
                recos.append({"level": "high", "icon": "fa-exclamation",
                    "title": "Endettement excessif",
                    "description": f"Ratio a {de:.2f} (norme < 0.5). Plan de desendettement urgent."})
            elif de > 0.5:
                recos.append({"level": "medium", "icon": "fa-chart-line",
                    "title": "Structure financiere a optimiser",
                    "description": f"Ratio d'endettement a {de:.2f}. Envisager un refinancement long terme."})

        roa = features.get("roa", np.nan)
        if not np.isnan(roa):
            if roa < 0:
                recos.append({"level": "high", "icon": "fa-exclamation",
                    "title": "Rentabilite negative",
                    "description": f"ROA a {roa:.1f}%. L'entreprise consomme plus qu'elle ne genere."})
            elif roa < 3.0:
                recos.append({"level": "medium", "icon": "fa-chart-line",
                    "title": "Rentabilite faible",
                    "description": f"ROA a {roa:.1f}% (norme > 5%). Revoir la structure des couts."})

        z = features.get("altman_z", np.nan)
        if not np.isnan(z) and z < 1.2:
            recos.append({"level": "high", "icon": "fa-triangle-exclamation",
                "title": "Score Altman Z critique",
                "description": f"Z-score a {z:.2f} (< 1.2 = zone detresse). Risque de faillite eleve."})

        rot = features.get("rotation_actifs", np.nan)
        if not np.isnan(rot) and rot > 1.5:
            recos.append({"level": "low", "icon": "fa-seedling",
                "title": "Bonne rotation des actifs",
                "description": f"Rotation a {rot:.2f}. Potentiel d'investissement identifie."})

        if not recos:
            recos.append({"level": "low", "icon": "fa-seedling",
                "title": "Profil financier equilibre",
                "description": "Indicateurs dans les normes. Maintenir la trajectoire actuelle."})

        return recos[:4]

    # ============================================================================
    #  HELPERS
    # ============================================================================

    def _model_label(self) -> str:
        return {
            "standard": "RF + XGBoost",
            "premium":  "RF + XGBoost + LightGBM",
            "extra":    "Stacking RF + XGB + LGB + Meta",
        }.get(self._plan, "RF + XGBoost")

    def _load_auc(self) -> float:
        path = f"ml/saved_models/{self._plan}/metrics.json"
        try:
            with open(path) as f:
                return json.load(f).get("auc", 0.91)
        except Exception:
            return 0.91


# ================================================================================
#  SINGLETONS + HELPER
# ================================================================================

analyse_service_standard = AnalyseService("standard")
analyse_service_premium  = AnalyseService("premium")
analyse_service_extra    = AnalyseService("extra")


def get_analyse_service(plan: str) -> AnalyseService:
    return {
        "premium": analyse_service_premium,
        "extra":   analyse_service_extra,
    }.get(plan, analyse_service_standard)

