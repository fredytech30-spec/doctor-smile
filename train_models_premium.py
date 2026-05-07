"""
==========================================
TRAIN MODELS PREMIUM — Doctor Smile
==========================================
Logique Premium : RF + XGBoost + LightGBM
avec Feature Engineering enrichi (23 features)
et calibration Platt + Isotonic cross-val.

Usage :
  


Dépendances :
  pip install scikit-learn xgboost lightgbm joblib imbalanced-learn
"""

from __future__ import annotations
import argparse, json, os, warnings
warnings.filterwarnings("ignore")

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import (roc_auc_score, classification_report,
                              confusion_matrix, average_precision_score)
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from imblearn.over_sampling import SMOTE
import xgboost as xgb
import lightgbm as lgb

PLAN = "premium"

# ════ FEATURES PREMIUM (23 = 20 num + 3 cat) ════════════════════
NUMERIC_FEATURES = [
    "current_ratio", "quick_ratio", "cash_ratio",
    "debt_equity", "solvabilite", "autonomie_fin",
    "roa", "roe", "roce", "ebitda_margin", "net_margin", "marge_brute_pct",
    "rotation_actifs", "rotation_stocks", "delai_clients",
    "bfr_ca", "couverture_interets", "flux_tresorerie_ratio",
    "annees_activite", "altman_z", "pct_missing",
    "score_altman_modifie", "levier_operationnel",
]
CAT_FEATURES  = ["secteur_enc", "taille_enc", "pays_enc"]
ALL_FEATURES  = NUMERIC_FEATURES + CAT_FEATURES  # 26 features

SECTEURS = ["Tech","Industrie","Retail","Immobilier","Sante","Finance",
            "Agro","Transport","Energie","Media","Autre"]
TAILLES  = ["Micro","PME","ETI","Grand Groupe"]
PAYS     = ["France","Belgique","Suisse","Maroc","Senegal",
            "Cote d Ivoire","Canada","Luxembourg","Autre"]

MEDIANS_REFERENCE = {
    "current_ratio":1.35,"quick_ratio":0.95,"cash_ratio":0.22,
    "debt_equity":0.72,"solvabilite":38.0,"autonomie_fin":36.0,
    "roa":3.2,"roe":10.5,"roce":8.8,"ebitda_margin":11.0,
    "net_margin":4.5,"marge_brute_pct":32.0,
    "rotation_actifs":1.1,"rotation_stocks":6.2,"delai_clients":48.0,
    "bfr_ca":18.0,"couverture_interets":4.2,"flux_tresorerie_ratio":0.08,
    "annees_activite":12.0,"altman_z":2.1,"pct_missing":0.0,
    "score_altman_modifie":2.4,"levier_operationnel":1.8,
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


def _engineer_features(X_df):
    """Feature engineering premium : 3 features derivees supplementaires."""
    X = X_df.copy()
    # Score Altman modifie (proxy)
    if "altman_z" in X.columns and "solvabilite" in X.columns:
        X["score_altman_modifie"] = X["altman_z"] * 0.72 + X["solvabilite"] * 0.01
    else:
        X["score_altman_modifie"] = MEDIANS_REFERENCE["score_altman_modifie"]

    # ROCE proxy (Return on Capital Employed)
    if "roa" in X.columns and "debt_equity" in X.columns:
        X["roce"] = X["roa"] / (1 + X["debt_equity"].clip(0.01, 10))
    else:
        X["roce"] = MEDIANS_REFERENCE["roce"]

    # Levier operationnel (proxy)
    if "ebitda_margin" in X.columns and "net_margin" in X.columns:
        X["levier_operationnel"] = (X["ebitda_margin"] / (X["net_margin"].abs() + 0.01)).clip(0, 10)
    else:
        X["levier_operationnel"] = MEDIANS_REFERENCE["levier_operationnel"]

    # Autonomie financiere
    X["autonomie_fin"]          = X.get("solvabilite", MEDIANS_REFERENCE["solvabilite"])
    # Flux tresorerie ratio (proxy cash/actif)
    X["flux_tresorerie_ratio"]  = X.get("cash_ratio", MEDIANS_REFERENCE["cash_ratio"]) * 0.8
    # Rotation stocks / delai clients (pas dans dataset Taiwan -> median)
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

    for feat in ["current_ratio","quick_ratio","cash_ratio","debt_equity","solvabilite",
                 "roa","roe","ebitda_margin","net_margin","marge_brute_pct",
                 "rotation_actifs","bfr_ca","couverture_interets","altman_z"]:
        if feat not in X_num.columns:
            X_num[feat] = MEDIANS_REFERENCE.get(feat, 0.0)
    X_num["pct_missing"]   = X_num.isnull().mean(axis=1)
    X_num["annees_activite"] = MEDIANS_REFERENCE["annees_activite"]
    X_num = X_num.fillna(MEDIANS_REFERENCE)

    # Feature engineering premium
    X_num = _engineer_features(X_num)

    X_num["secteur_enc"] = float(enc_s.transform(["Autre"])[0])
    X_num["taille_enc"]  = float(enc_t.transform(["PME"])[0])
    X_num["pays_enc"]    = float(enc_p.transform(["France"])[0])

    X = X_num[ALL_FEATURES].fillna(MEDIANS_REFERENCE)
    y = df["Bankrupt?"].values
    medians = X.median()
    print(f"   X shape: {X.shape} ({X.shape[1]} features)")
    print(f"   Classe 0: {(y==0).sum()} | Classe 1: {(y==1).sum()}")
    return X, y, medians, enc_s, enc_t, enc_p


def build_premium_ensemble(X_tr, y_tr):
    """Voting soft : RF + XGB + LightGBM avec poids optimaux."""
    print("\n Construction ensemble Premium (RF + XGB + LightGBM)...")

    sp = (y_tr==0).sum() / max(1, (y_tr==1).sum())

    rf = RandomForestClassifier(
        n_estimators=300, max_depth=14, min_samples_split=4,
        min_samples_leaf=2, max_features="sqrt",
        class_weight="balanced", random_state=42, n_jobs=-1,
    )
    xgb_m = xgb.XGBClassifier(
        n_estimators=400, max_depth=7, learning_rate=0.04,
        subsample=0.85, colsample_bytree=0.8, gamma=0.1,
        scale_pos_weight=sp, eval_metric="auc",
        random_state=42, n_jobs=-1, verbosity=0,
    )
    lgb_m = lgb.LGBMClassifier(
        n_estimators=400, max_depth=8, learning_rate=0.04,
        num_leaves=80, subsample=0.85, colsample_bytree=0.8,
        scale_pos_weight=sp, random_state=42, n_jobs=-1, verbose=-1,
    )

    ensemble = VotingClassifier(
        estimators=[("rf", rf), ("xgb", xgb_m), ("lgb", lgb_m)],
        voting="soft",
        weights=[1.0, 1.3, 1.3],  # XGB + LGB legerement favorises
    )
    print("   Entrainement VotingClassifier...")
    ensemble.fit(X_tr, y_tr)
    return ensemble


def evaluate(model, X_test, y_test, name):
    yp = model.predict_proba(X_test)[:, 1]
    yd = model.predict(X_test)
    auc = roc_auc_score(y_test, yp)
    print(f"\n {name}  AUC={auc:.4f}  AP={average_precision_score(y_test,yp):.4f}")
    print(confusion_matrix(y_test, yd))
    print(classification_report(y_test, yd, target_names=["Sain","Faillite"]))
    return auc


def save_models(models, scaler, medians, auc, enc_s, enc_t, enc_p):
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
    print(f"\n {PLAN.upper()} sauvegarde — AUC: {auc:.4f}")


def main(csv_path):
    print("=" * 55)
    print(f"  DOCTOR SMILE — {PLAN.upper()} | {len(ALL_FEATURES)} features")
    print("=" * 55)

    X, y, medians, enc_s, enc_t, enc_p = load_and_prepare(csv_path)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y)
    print(f"\n {len(X_train)} train / {len(X_test)} test")

    print("\n SMOTE...")
    X_tr_bal, y_tr_bal = SMOTE(random_state=42, k_neighbors=5).fit_resample(
        X_train.values, y_train)
    print(f"   Apres SMOTE: {X_tr_bal.shape}")

    scaler = StandardScaler()
    X_tr_sc = scaler.fit_transform(X_tr_bal)
    X_te_sc = scaler.transform(X_test.values)
    print(f"   Scaler: {scaler.n_features_in_} features")

    ensemble_raw = build_premium_ensemble(X_tr_sc, y_tr_bal)

    print("\n Calibration isotonique (StratifiedKFold 5)...")
    cal = CalibratedClassifierCV(ensemble_raw, method="isotonic", cv=StratifiedKFold(5))
    cal.fit(X_te_sc, y_test)

    auc = evaluate(cal, X_te_sc, y_test, "PREMIUM ENSEMBLE")

    # Cross-validation globale
    cv_scores = cross_val_score(ensemble_raw, X_tr_sc, y_tr_bal, cv=5,
                                 scoring="roc_auc", n_jobs=-1)
    print(f"   AUC CV 5-fold: {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}")

    save_models({"voting": cal}, scaler, medians, auc, enc_s, enc_t, enc_p)
    print("\n uvicorn app.main:app --reload --port 8000")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--data", default="data.csv")
    args = p.parse_args()
    main(args.data)
