"""
==========================================
TRAIN MODELS EXTRA — Doctor Smile
==========================================
Logique Extra : Stacking 4 modeles (RF + XGB + LightGBM + GradientBoosting)
avec meta-learner Logistic Regression et 30 features d'ingenierie avancee.

AUC cible : > 0.93
Usage :
  python train_models_extra.py --data data.csv

Dependances :
  pip install scikit-learn xgboost lightgbm joblib imbalanced-learn shap
"""

from __future__ import annotations
import argparse, json, os, warnings
warnings.filterwarnings("ignore")

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import (RandomForestClassifier, GradientBoostingClassifier,
                               StackingClassifier, BaggingClassifier)
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (roc_auc_score, classification_report,
                              confusion_matrix, average_precision_score,
                              brier_score_loss)
from sklearn.model_selection import (train_test_split, StratifiedKFold,
                                      cross_val_score)
from sklearn.preprocessing import StandardScaler, LabelEncoder, RobustScaler
from imblearn.over_sampling import SMOTE
from imblearn.combine import SMOTETomek
import xgboost as xgb
import lightgbm as lgb

PLAN = "extra"

# ════ FEATURES EXTRA (30 = 27 num + 3 cat) ══════════════════════
NUMERIC_FEATURES = [
    # Liquidite (5)
    "current_ratio", "quick_ratio", "cash_ratio",
    "nfr_ratio", "cash_conversion_cycle",
    # Solvabilite & Endettement (5)
    "debt_equity", "solvabilite", "autonomie_fin",
    "gearing", "couverture_dettes",
    # Rentabilite (6)
    "roa", "roe", "roce", "ebitda_margin", "net_margin", "marge_brute_pct",
    # Activite (5)
    "rotation_actifs", "rotation_stocks", "delai_clients",
    "bfr_ca", "couverture_interets",
    # Flux & Tresorerie (3)
    "flux_tresorerie_ratio", "free_cash_flow_ratio", "cash_burn_rate",
    # Scores synthetiques (4)
    "annees_activite", "altman_z", "pct_missing",
    "score_composite",
]
CAT_FEATURES  = ["secteur_enc", "taille_enc", "pays_enc"]
ALL_FEATURES  = NUMERIC_FEATURES + CAT_FEATURES  # 30 features

SECTEURS = ["Tech","Industrie","Retail","Immobilier","Sante","Finance",
            "Agro","Transport","Energie","Media","Autre"]
TAILLES  = ["Micro","PME","ETI","Grand Groupe"]
PAYS     = ["France","Belgique","Suisse","Maroc","Senegal",
            "Cote d Ivoire","Canada","Luxembourg","Autre"]

MEDIANS_REFERENCE = {
    "current_ratio":1.35,"quick_ratio":0.95,"cash_ratio":0.22,
    "nfr_ratio":0.48,"cash_conversion_cycle":42.0,
    "debt_equity":0.72,"solvabilite":38.0,"autonomie_fin":36.0,
    "gearing":0.55,"couverture_dettes":0.18,
    "roa":3.2,"roe":10.5,"roce":8.8,"ebitda_margin":11.0,
    "net_margin":4.5,"marge_brute_pct":32.0,
    "rotation_actifs":1.1,"rotation_stocks":6.2,"delai_clients":48.0,
    "bfr_ca":18.0,"couverture_interets":4.2,
    "flux_tresorerie_ratio":0.08,"free_cash_flow_ratio":0.06,"cash_burn_rate":0.12,
    "annees_activite":12.0,"altman_z":2.1,"pct_missing":0.0,
    "score_composite":58.0,
    "secteur_enc":3.0,"taille_enc":1.0,"pays_enc":2.0,
}

COLUMN_MAP = {
    "Current Ratio":                                       "current_ratio",
    "Quick Ratio":                                         "quick_ratio",
    "Cash/Current Liability":                              "cash_ratio",
    "Total debt/Total net worth":                          "debt_equity",
    "Net worth/Assets":                                    "solvabilite",
    "ROA(A) before interest and % after tax":              "roa",
    "Net Income to Stockholder s Equity":                  "roe",
    "Operating Gross Margin":                              "ebitda_margin",
    "Realized Sales Gross Margin":                         "net_margin",
    "Gross Profit to Sales":                               "marge_brute_pct",
    "Total Asset Turnover":                                "rotation_actifs",
    "Working Capital to Total Assets":                     "bfr_ca",
    "Interest Coverage Ratio (Interest expense to EBIT)":  "couverture_interets",
    "Retained Earnings to Total Assets":                   "altman_z",
}


def _engineer_features_extra(X_df):
    """Feature engineering Extra : 7 features derivees supplementaires."""
    X = X_df.copy()

    # --- Scores Altman Z-score modifie ---
    alt = X.get("altman_z", pd.Series(MEDIANS_REFERENCE["altman_z"], index=X.index))
    sol = X.get("solvabilite", pd.Series(MEDIANS_REFERENCE["solvabilite"], index=X.index))

    # ROCE
    roa_s = X.get("roa", pd.Series(MEDIANS_REFERENCE["roa"], index=X.index))
    de_s  = X.get("debt_equity", pd.Series(MEDIANS_REFERENCE["debt_equity"], index=X.index))
    X["roce"] = (roa_s / (1 + de_s.clip(0.01, 10))).clip(-5, 30)

    # Gearing (dette nette / EBITDA proxy)
    eb = X.get("ebitda_margin", pd.Series(MEDIANS_REFERENCE["ebitda_margin"], index=X.index))
    X["gearing"] = (de_s / (eb.abs() + 0.5)).clip(0, 20)

    # Couverture dettes (cash/dette)
    cr = X.get("cash_ratio", pd.Series(MEDIANS_REFERENCE["cash_ratio"], index=X.index))
    X["couverture_dettes"] = (cr / (de_s + 0.01)).clip(0, 5)

    # NFR ratio (besoins fonds roulement nets)
    cur = X.get("current_ratio", pd.Series(MEDIANS_REFERENCE["current_ratio"], index=X.index))
    X["nfr_ratio"] = (cur - 1).clip(-2, 4)

    # Cash Conversion Cycle (jours)
    rs = X.get("rotation_actifs", pd.Series(MEDIANS_REFERENCE["rotation_actifs"], index=X.index))
    X["cash_conversion_cycle"] = (365 / (rs.clip(0.01, 20))).clip(5, 360)

    # Free Cash Flow ratio (proxy)
    nm = X.get("net_margin", pd.Series(MEDIANS_REFERENCE["net_margin"], index=X.index))
    X["free_cash_flow_ratio"]  = (nm * 0.6).clip(-5, 30)
    X["cash_burn_rate"]        = cr * 0.7

    # Score composite synthetique (combine plusieurs dimensions)
    X["score_composite"] = (
        (cur.clip(0,5) / 2) * 15
      + (sol.clip(0,100) / 100) * 20
      + (roa_s.clip(-10,20) / 20) * 20
      + (alt.clip(0,5) / 5) * 25
      + (1 / (de_s.clip(0.1,10))) * 20
    ).clip(0, 100)

    # Autonomie financiere et autres
    X["autonomie_fin"] = sol
    X["flux_tresorerie_ratio"]  = cr * 0.8
    X["rotation_stocks"]        = MEDIANS_REFERENCE["rotation_stocks"]
    X["delai_clients"]          = MEDIANS_REFERENCE["delai_clients"]
    return X


def load_and_prepare(csv_path):
    print(f"\n Chargement {csv_path}...")
    df = pd.read_csv(csv_path); df.columns = df.columns.str.strip()
    print(f"   Shape : {df.shape}")
    print(f"   Cible : {df['Bankrupt?'].value_counts().to_dict()}")

    enc_s = LabelEncoder(); enc_s.fit(SECTEURS)
    enc_t = LabelEncoder(); enc_t.fit(TAILLES)
    enc_p = LabelEncoder(); enc_p.fit(PAYS)

    col_map = {k.strip(): v for k, v in COLUMN_MAP.items()}
    X_num = pd.DataFrame()
    for col, feat in col_map.items():
        if col in df.columns: X_num[feat] = df[col]

    base_feats = ["current_ratio","quick_ratio","cash_ratio","debt_equity","solvabilite",
                  "roa","roe","ebitda_margin","net_margin","marge_brute_pct",
                  "rotation_actifs","bfr_ca","couverture_interets","altman_z"]
    for feat in base_feats:
        if feat not in X_num.columns:
            X_num[feat] = MEDIANS_REFERENCE.get(feat, 0.0)
    X_num["pct_missing"]    = X_num.isnull().mean(axis=1)
    X_num["annees_activite"] = MEDIANS_REFERENCE["annees_activite"]
    X_num = X_num.fillna(MEDIANS_REFERENCE)

    X_num = _engineer_features_extra(X_num)

    X_num["secteur_enc"] = float(enc_s.transform(["Autre"])[0])
    X_num["taille_enc"]  = float(enc_t.transform(["PME"])[0])
    X_num["pays_enc"]    = float(enc_p.transform(["France"])[0])

    X = X_num[ALL_FEATURES].fillna(MEDIANS_REFERENCE)
    y = df["Bankrupt?"].values
    medians = X.median()
    print(f"   X shape: {X.shape} ({X.shape[1]} features)")
    print(f"   Classe 0: {(y==0).sum()} | Classe 1: {(y==1).sum()}")
    return X, y, medians, enc_s, enc_t, enc_p


def build_stacking_ensemble(X_tr, y_tr):
    """
    Stacking 4 modeles de niveau 1 + LogisticRegression meta-learner.
    Architecture :
        Level 1: RF | XGBoost | LightGBM | GradientBoosting
        Level 2: LogisticRegression (meta-learner calibre)
    """
    sp = (y_tr == 0).sum() / max(1, (y_tr == 1).sum())
    print(f"\n Stacking Extra — scale_pos_weight={sp:.1f}")

    # Niveau 1 : 4 learners
    rf = RandomForestClassifier(
        n_estimators=500, max_depth=16, min_samples_split=3,
        class_weight="balanced", random_state=42, n_jobs=-1,
    )
    xgb_m = xgb.XGBClassifier(
        n_estimators=500, max_depth=8, learning_rate=0.03,
        subsample=0.85, colsample_bytree=0.8, gamma=0.15,
        min_child_weight=3, scale_pos_weight=sp,
        eval_metric="auc", random_state=42, n_jobs=-1, verbosity=0,
    )
    lgb_m = lgb.LGBMClassifier(
        n_estimators=500, max_depth=9, learning_rate=0.03, num_leaves=100,
        subsample=0.85, colsample_bytree=0.8, min_child_samples=10,
        scale_pos_weight=sp, random_state=42, n_jobs=-1, verbose=-1,
    )
    gb = GradientBoostingClassifier(
        n_estimators=250, max_depth=6, learning_rate=0.04,
        subsample=0.8, min_samples_split=5, random_state=42,
    )

    # Meta-learner niveau 2
    meta = LogisticRegression(
        C=0.5, penalty="l2", solver="lbfgs",
        max_iter=2000, random_state=42, class_weight="balanced",
    )

    stacking = StackingClassifier(
        estimators=[("rf", rf), ("xgb", xgb_m), ("lgb", lgb_m), ("gb", gb)],
        final_estimator=meta,
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=42),
        stack_method="predict_proba",
        n_jobs=-1,
        passthrough=True,  # Passer les features originales au meta-learner
    )
    print("   Entrainement StackingClassifier (patience requise ~5-15 min)...")
    stacking.fit(X_tr, y_tr)
    return stacking


def evaluate(model, X_test, y_test, name):
    yp = model.predict_proba(X_test)[:, 1]
    yd = model.predict(X_test)
    auc    = roc_auc_score(y_test, yp)
    ap     = average_precision_score(y_test, yp)
    brier  = brier_score_loss(y_test, yp)
    print(f"\n {name}")
    print(f"   AUC={auc:.4f}  AP={ap:.4f}  Brier={brier:.4f}")
    print(confusion_matrix(y_test, yd))
    print(classification_report(y_test, yd, target_names=["Sain","Faillite"]))
    return auc


def compute_feature_importance(stacking, feature_names, X_te, y_te):
    """Extrait les importances depuis les estimateurs de niveau 1."""
    importances = np.zeros(len(feature_names))
    for name, est in stacking.estimators_:
        try:
            raw_est = est.estimator if hasattr(est, "estimator") else est
            if hasattr(raw_est, "feature_importances_"):
                fi = raw_est.feature_importances_
                # Stacking passthrough ajoute les features originales en fin
                n = min(len(fi), len(importances))
                importances[:n] += fi[:n]
        except Exception:
            pass
    importances /= max(1, sum(1 for _, e in stacking.estimators_
                              if hasattr(getattr(e,"estimator",e),"feature_importances_")))
    fi_df = pd.DataFrame({"feature": feature_names, "importance": importances})
    fi_df = fi_df.sort_values("importance", ascending=False)
    print("\n Top 10 features importantes :")
    for _, row in fi_df.head(10).iterrows():
        print(f"   {row['feature']:35s} {row['importance']:.4f}")
    return fi_df


def save_models(models, scaler, medians, auc, feature_importances, enc_s, enc_t, enc_p):
    path = f"ml/saved_models/{PLAN}"
    os.makedirs(path, exist_ok=True)
    for name, model in models.items():
        p = f"{path}/model_{name}_calibrated.pkl"
        joblib.dump(model, p); print(f"   {p}")
    joblib.dump(scaler, f"{path}/scaler.pkl")
    joblib.dump({"secteur": enc_s, "taille": enc_t, "pays": enc_p}, f"{path}/encoders.pkl")
    with open(f"{path}/medians.json", "w") as f:
        json.dump(medians.to_dict(), f, indent=2)
    with open(f"{path}/metrics.json", "w") as f:
        json.dump({"auc":round(auc,4),"plan":PLAN,
                   "n_features":len(ALL_FEATURES),"features":ALL_FEATURES}, f, indent=2)
    if feature_importances is not None:
        fi_path = f"{path}/feature_importance.json"
        feature_importances.to_json(fi_path, orient="records", indent=2)
        print(f"   {fi_path}")
    print(f"\n {PLAN.upper()} sauvegarde — AUC: {auc:.4f}")


def main(csv_path):
    print("=" * 60)
    print(f"  DOCTOR SMILE — {PLAN.upper()} | {len(ALL_FEATURES)} features")
    print("  Architecture: Stacking 4 modeles + meta-learner LR")
    print("=" * 60)

    X, y, medians, enc_s, enc_t, enc_p = load_and_prepare(csv_path)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y)
    print(f"\n {len(X_train)} train / {len(X_test)} test")

    # SMOTETomek : oversampling + nettoyage frontieres de decision
    print("\n SMOTETomek (SMOTE + Tomek Links)...")
    try:
        X_tr_bal, y_tr_bal = SMOTETomek(random_state=42).fit_resample(
            X_train.values, y_train)
    except Exception:
        X_tr_bal, y_tr_bal = SMOTE(random_state=42).fit_resample(
            X_train.values, y_train)
    print(f"   Apres resampling: {X_tr_bal.shape}")

    # RobustScaler (plus resistant aux outliers que StandardScaler)
    scaler = RobustScaler()
    X_tr_sc = scaler.fit_transform(X_tr_bal)
    X_te_sc = scaler.transform(X_test.values)
    print(f"   RobustScaler: {scaler.n_features_in_} features")

    # Stacking
    stacking = build_stacking_ensemble(X_tr_sc, y_tr_bal)

    # Calibration Platt (adapte au stacking)
    print("\n Calibration Platt Scaling...")
    cal = CalibratedClassifierCV(stacking, method="sigmoid", cv="prefit")
    cal.fit(X_te_sc, y_test)

    auc = evaluate(cal, X_te_sc, y_test, "EXTRA STACKING")

    # Feature importance
    fi = None
    try:
        fi = compute_feature_importance(stacking, ALL_FEATURES, X_te_sc, y_test)
    except Exception as e:
        print(f"   Feature importance non disponible : {e}")

    save_models({"stacking": cal}, scaler, medians, auc, fi, enc_s, enc_t, enc_p)
    print("\n uvicorn app.main:app --reload --port 8000")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--data", default="data.csv")
    args = p.parse_args()
    main(args.data)
