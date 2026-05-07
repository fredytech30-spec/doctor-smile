"""
==========================================
TRAIN MODELS — Doctor Smile  v2
==========================================
Entraîne RF + XGBoost + LightGBM + Meta-Learner (stacking)
selon le plan choisi :

  standard → RF + XGBoost
  premium  → RF + XGBoost + LightGBM
  extra    → RF + XGBoost + LightGBM + Meta-Learner (stacking LogisticRegression)

Le meta-learner (plan extra) est attendu par analyse_service.py
sous le nom  model_meta_calibrated.pkl

Usage :
  python train_models.py --data data.csv --plan standard
  python train_models.py --data data.csv --plan premium
  python train_models.py --data data.csv --plan extra

Dépendances :
  pip install scikit-learn xgboost lightgbm joblib imbalanced-learn
"""

from __future__ import annotations
import argparse, json, os, warnings
warnings.filterwarnings("ignore")

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration      import CalibratedClassifierCV
from sklearn.ensemble         import RandomForestClassifier
from sklearn.linear_model     import LogisticRegression
from sklearn.metrics          import (roc_auc_score, classification_report,
                                       confusion_matrix, average_precision_score)
from sklearn.model_selection  import StratifiedKFold, cross_val_predict, train_test_split
from sklearn.preprocessing    import StandardScaler, LabelEncoder
from imblearn.over_sampling   import SMOTE
import xgboost  as xgb
import lightgbm as lgb

# ════════════════════════════════════════════════════════════════
#  FEATURES — identique à preprocessing_service.py
#  16 numériques + 3 catégorielles = 19 features total
# ════════════════════════════════════════════════════════════════

NUMERIC_FEATURES = [
    "current_ratio", "quick_ratio", "cash_ratio", "debt_equity",
    "solvabilite", "roa", "roe", "ebitda_margin", "net_margin",
    "marge_brute_pct", "rotation_actifs", "bfr_ca", "couverture_interets",
    "annees_activite", "altman_z", "pct_missing",
]
CAT_FEATURES = ["secteur_enc", "taille_enc", "pays_enc"]
ALL_FEATURES = NUMERIC_FEATURES + CAT_FEATURES   # 19 features

SECTEURS = ["Tech","Industrie","Retail","Immobilier","Santé","Finance",
            "Agro","Transport","Energie","Media","Autre"]
TAILLES  = ["Micro","PME","ETI","Grand Groupe"]
PAYS     = ["France","Belgique","Suisse","Maroc","Sénégal",
            "Côte d'Ivoire","Canada","Luxembourg","Cameroun",
            "Congo","Gabon","Mali","Burkina Faso","Madagascar","Autre"]


# ── Médians de référence EUROPÉENS ──────────────────────────────
# Source : Banque de France FIBEN, BCE Statistical Data Warehouse,
#          Altman (2000) révision européenne, données 2019-2023.
# Ces valeurs servent à normaliser (x - median) / std.
# CRITIQUE : utiliser des médians taïwanais avec des entreprises
# européennes produit des z-scores faux → scores tous > 90.
MEDIANS_REFERENCE = {
    "current_ratio":    1.20,   # BdF : médiane PME françaises
    "quick_ratio":      0.85,
    "cash_ratio":       0.18,
    "debt_equity":      1.50,   # Europe : endettement plus élevé qu'en Asie
    "solvabilite":      30.0,   # Capitaux propres / actif total (%)
    "roa":               2.8,   # Rentabilité actif avant IS
    "roe":               9.0,
    "ebitda_margin":    12.0,
    "net_margin":        4.0,
    "marge_brute_pct":  32.0,
    "rotation_actifs":   0.85,  # Europe : plus faible qu'en Asie
    "bfr_ca":           15.0,
    "couverture_interets": 3.5,
    "annees_activite":  12.0,
    "altman_z":          2.0,   # Z-score Altman révision européenne
    "pct_missing":       0.0,
    "secteur_enc":       3.0,
    "taille_enc":        1.0,
    "pays_enc":          2.0,
}

# Mapping colonnes CSV → features internes
COLUMN_MAP = {
    "Current Ratio":                                       "current_ratio",
    "Quick Ratio":                                         "quick_ratio",
    "Cash/Current Liability":                              "cash_ratio",
    "Total debt/Total net worth":                          "debt_equity",
    "Net worth/Assets":                                    "solvabilite",
    "ROA(A) before interest and % after tax":              "roa",
    "Net Income to Stockholder's Equity":                  "roe",
    "Operating Gross Margin":                              "ebitda_margin",
    "Realized Sales Gross Margin":                         "net_margin",
    "Gross Profit to Sales":                               "marge_brute_pct",
    "Total Asset Turnover":                                "rotation_actifs",
    "Working Capital to Total Assets":                     "bfr_ca",
    "Interest Coverage Ratio (Interest expense to EBIT)":  "couverture_interets",
    "Retained Earnings to Total Assets":                   "altman_z",
    "annees_activite":                                     "annees_activite",   # ← colonne ajoutée
}


# ════════════════════════════════════════════════════════════════
#  CHARGEMENT + PRÉPARATION
# ════════════════════════════════════════════════════════════════

def load_and_prepare(csv_path: str):
    print(f"\n📂 Chargement de {csv_path}...")
    df = pd.read_csv(csv_path)
    df.columns = df.columns.str.strip()
    print(f"   Shape : {df.shape}")
    print(f"   Cible : {df['Bankrupt?'].value_counts().to_dict()}")

    enc_s = LabelEncoder(); enc_s.fit(SECTEURS)
    enc_t = LabelEncoder(); enc_t.fit(TAILLES)
    enc_p = LabelEncoder(); enc_p.fit(PAYS)

    col_map = {k.strip(): v for k, v in COLUMN_MAP.items()}
    X_num = pd.DataFrame()
    for col, feat in col_map.items():
        if col in df.columns:
            X_num[feat] = df[col]

    for feat in NUMERIC_FEATURES:
        if feat not in X_num.columns:
            X_num[feat] = MEDIANS_REFERENCE.get(feat, 0.0)
    X_num = X_num[NUMERIC_FEATURES].fillna(MEDIANS_REFERENCE)

    # Catégorielles neutres (absentes du dataset taiwanais)
    X_num["secteur_enc"] = float(enc_s.transform(["Autre"])[0])
    X_num["taille_enc"]  = float(enc_t.transform(["PME"])[0])
    X_num["pays_enc"]    = float(enc_p.transform(["France"])[0])

    X = X_num[ALL_FEATURES]
    y = df["Bankrupt?"].values
    medians = X.median()

    print(f"\n✅ X shape : {X.shape}  ({X.shape[1]} features = 16 num + 3 cat)")
    print(f"   Classe 0 : {(y==0).sum()} | Classe 1 : {(y==1).sum()}")
    return X, y, medians, enc_s, enc_t, enc_p


# ════════════════════════════════════════════════════════════════
#  SMOTE + SCALING
# ════════════════════════════════════════════════════════════════

def apply_smote(X: np.ndarray, y: np.ndarray):
    print("\n⚖️  Application SMOTE...")
    X_res, y_res = SMOTE(random_state=42, k_neighbors=5).fit_resample(X, y)
    print(f"   Après SMOTE : {X_res.shape}  "
          f"(0:{(y_res==0).sum()} | 1:{(y_res==1).sum()})")
    return X_res, y_res


# ════════════════════════════════════════════════════════════════
#  ENTRAÎNEMENT DES MODÈLES DE BASE
# ════════════════════════════════════════════════════════════════

def train_rf(X: np.ndarray, y: np.ndarray) -> RandomForestClassifier:
    print("\n🌲 Random Forest...")
    m = RandomForestClassifier(
        n_estimators=200, max_depth=12,
        min_samples_split=5, min_samples_leaf=2,
        max_features="sqrt", class_weight="balanced",
        random_state=42, n_jobs=-1,
    )
    m.fit(X, y)
    print("   ✅ RF entraîné")
    return m


def train_xgb(X: np.ndarray, y: np.ndarray) -> xgb.XGBClassifier:
    print("\n⚡ XGBoost...")
    sp = (y == 0).sum() / (y == 1).sum()
    m = xgb.XGBClassifier(
        n_estimators=300, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        scale_pos_weight=sp, eval_metric="auc",
        random_state=42, n_jobs=-1, verbosity=0,
    )
    m.fit(X, y)
    print("   ✅ XGB entraîné")
    return m


def train_lgb(X: np.ndarray, y: np.ndarray) -> lgb.LGBMClassifier:
    print("\n💡 LightGBM...")
    sp = (y == 0).sum() / (y == 1).sum()
    m = lgb.LGBMClassifier(
        n_estimators=300, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        scale_pos_weight=sp, random_state=42,
        n_jobs=-1, verbose=-1,
    )
    m.fit(X, y)
    print("   ✅ LGB entraîné")
    return m


# ════════════════════════════════════════════════════════════════
#  META-LEARNER (plan extra) — Stacking avec OOF
# ════════════════════════════════════════════════════════════════

def train_meta_learner(
    base_models: dict,          # {"rf": m, "xgb": m, "lgb": m}  modèles calibrés
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test:  np.ndarray,
    y_test:  np.ndarray,
) -> LogisticRegression:
    """
    Entraîne un meta-learner (Logistic Regression) sur les prédictions
    OOF (Out-Of-Fold) des modèles de base.

    Étapes :
      1. Générer les prédictions OOF sur X_train (cross_val_predict, cv=5)
      2. Assembler la meta-matrice [p_rf | p_xgb | p_lgb]
      3. Entraîner LogisticRegression sur cette meta-matrice
      4. Sauvegarder comme CalibratedClassifierCV
    """
    print("\n🧠 Meta-Learner (Stacking L2)...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    # ── 1. OOF sur le train ────────────────────────────────────
    oof_train = np.zeros((len(X_train), len(base_models)))
    for i, (name, model) in enumerate(base_models.items()):
        print(f"   OOF {name}...", end=" ", flush=True)
        oof = cross_val_predict(
            model, X_train, y_train,
            cv=cv, method="predict_proba", n_jobs=-1,
        )[:, 1]
        oof_train[:, i] = oof
        print(f"AUC={roc_auc_score(y_train, oof):.4f}")

    # ── 2. Prédictions sur le test ─────────────────────────────
    meta_test = np.zeros((len(X_test), len(base_models)))
    for i, (name, model) in enumerate(base_models.items()):
        meta_test[:, i] = model.predict_proba(X_test)[:, 1]

    # ── 3. Meta-learner ────────────────────────────────────────
    meta = LogisticRegression(C=0.5, max_iter=1000, random_state=42, solver="lbfgs")
    meta.fit(oof_train, y_train)

    auc_meta = roc_auc_score(y_test, meta.predict_proba(meta_test)[:, 1])
    print(f"   ✅ Meta-Learner entraîné  AUC={auc_meta:.4f}")
    print(f"   Coefs : { {n: round(c, 3) for n, c in zip(base_models, meta.coef_[0])} }")
    return meta, meta_test


# ════════════════════════════════════════════════════════════════
#  CALIBRATION
# ════════════════════════════════════════════════════════════════

def calibrate(model, X: np.ndarray, y: np.ndarray):
    print("   📐 Calibration...", end=" ", flush=True)
    cal = CalibratedClassifierCV(model, method="isotonic", cv=3)
    cal.fit(X, y)
    print("✅")
    return cal


# ════════════════════════════════════════════════════════════════
#  ÉVALUATION
# ════════════════════════════════════════════════════════════════

def evaluate(model, X_test: np.ndarray, y_test: np.ndarray, name: str) -> float:
    yp = model.predict_proba(X_test)[:, 1]
    yd = model.predict(X_test)
    auc = roc_auc_score(y_test, yp)
    ap  = average_precision_score(y_test, yp)
    print(f"\n📊 {name:20s}  AUC={auc:.4f}  AP={ap:.4f}")
    print(confusion_matrix(y_test, yd))
    print(classification_report(y_test, yd, target_names=["Sain", "Faillite"]))
    return auc


def evaluate_meta(meta, meta_test: np.ndarray, y_test: np.ndarray) -> float:
    """Évalue le meta-learner directement sur sa meta-matrice test."""
    yp  = meta.predict_proba(meta_test)[:, 1]
    yd  = meta.predict(meta_test)
    auc = roc_auc_score(y_test, yp)
    ap  = average_precision_score(y_test, yp)
    print(f"\n📊 {'META-LEARNER':20s}  AUC={auc:.4f}  AP={ap:.4f}")
    print(confusion_matrix(y_test, yd))
    print(classification_report(y_test, yd, target_names=["Sain", "Faillite"]))
    return auc


# ════════════════════════════════════════════════════════════════
#  SAUVEGARDE
# ════════════════════════════════════════════════════════════════

def save_models(
    models:  dict,          # modèles calibrés à sauvegarder
    scaler:  StandardScaler,
    medians: pd.Series,
    auc:     float,
    plan:    str,
    enc_s:   LabelEncoder,
    enc_t:   LabelEncoder,
    enc_p:   LabelEncoder,
) -> None:
    path = f"ml/saved_models/{plan}"
    os.makedirs(path, exist_ok=True)

    print(f"\n💾 Sauvegarde dans {path}/")
    for name, model in models.items():
        p = f"{path}/model_{name}_calibrated.pkl"
        joblib.dump(model, p)
        print(f"   ✅ {p}")

    scaler_path = f"{path}/scaler.pkl"
    joblib.dump(scaler, scaler_path)
    print(f"   ✅ {scaler_path}  ({scaler.n_features_in_} features)")

    encoders = {"secteur": enc_s, "taille": enc_t, "pays": enc_p}
    joblib.dump(encoders, f"{path}/encoders.pkl")
    print(f"   ✅ {path}/encoders.pkl")

    with open(f"{path}/medians.json", "w") as f:
        json.dump(medians.to_dict(), f, indent=2)
    print(f"   ✅ {path}/medians.json")

    metrics = {
        "auc":        round(auc, 4),
        "plan":       plan,
        "n_features": len(ALL_FEATURES),
        "features":   ALL_FEATURES,
        "models":     list(models.keys()),
    }
    with open(f"{path}/metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"   ✅ {path}/metrics.json")

    print(f"\n🎉 Plan '{plan}' sauvegardé — {len(ALL_FEATURES)} features, AUC={auc:.4f}")


# ════════════════════════════════════════════════════════════════
#  MAIN
# ════════════════════════════════════════════════════════════════

def main(csv_path: str, plan: str) -> None:
    print("=" * 58)
    print(f"  DOCTOR SMILE — {plan.upper()} | {len(ALL_FEATURES)} features")
    print("=" * 58)

    # ── Chargement ────────────────────────────────────────────
    X, y, medians, enc_s, enc_t, enc_p = load_and_prepare(csv_path)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y,
    )
    print(f"\n🔀 {len(X_train)} train / {len(X_test)} test")

    # ── SMOTE sur le train uniquement ─────────────────────────
    X_tr_bal, y_tr_bal = apply_smote(X_train.values, y_train)

    # ── Scaling ───────────────────────────────────────────────
    scaler    = StandardScaler()
    X_tr_sc   = scaler.fit_transform(X_tr_bal)
    X_te_sc   = scaler.transform(X_test.values)
    X_tr_orig = scaler.transform(X_train.values)   # train original (pour OOF meta)
    print(f"📐 Scaler fitté sur {scaler.n_features_in_} features ✅")

    # ── Modèles de base ───────────────────────────────────────
    models_raw: dict = {}
    if plan in ("standard", "premium", "extra"):
        models_raw["rf"]  = train_rf(X_tr_sc, y_tr_bal)
        models_raw["xgb"] = train_xgb(X_tr_sc, y_tr_bal)
    if plan in ("premium", "extra"):
        models_raw["lgb"] = train_lgb(X_tr_sc, y_tr_bal)

    # ── Calibration modèles de base ───────────────────────────
    print("\n📐 Calibration des modèles de base...")
    models_cal: dict = {n: calibrate(m, X_te_sc, y_test) for n, m in models_raw.items()}

    # ── Évaluation modèles de base ────────────────────────────
    print("\n" + "=" * 58 + "  ÉVALUATION BASE")
    aucs = [evaluate(m, X_te_sc, y_test, n.upper()) for n, m in models_cal.items()]

    # ── Meta-Learner (extra uniquement) ──────────────────────
    if plan == "extra":
        print("\n" + "=" * 58 + "  META-LEARNER")

        # Les modèles de base calibrés font les OOF sur X_train_original scalé
        meta_raw, meta_test_matrix = train_meta_learner(
            base_models=models_cal,
            X_train=X_tr_orig,
            y_train=y_train,
            X_test=X_te_sc,
            y_test=y_test,
        )

        # Calibrer le meta-learner (sur meta_test_matrix, pas sur X_te_sc)
        print("   📐 Calibration meta-learner...", end=" ", flush=True)
        meta_cal = CalibratedClassifierCV(meta_raw, method="isotonic", cv=3)
        meta_cal.fit(meta_test_matrix, y_test)
        print("✅")

        auc_meta = evaluate_meta(meta_raw, meta_test_matrix, y_test)
        aucs.append(auc_meta)
        models_cal["meta"] = meta_cal
        print(f"\n💡 Note : le meta-learner est sauvegardé comme model_meta_calibrated.pkl")
        print(f"   analyse_service.py l'utilise avec un poids de 0.15 (plan extra)")

    # ── Sauvegarde ────────────────────────────────────────────
    print("\n" + "=" * 58 + "  SAUVEGARDE")
    save_models(models_cal, scaler, medians, max(aucs), plan, enc_s, enc_t, enc_p)

    print(f"\n🚀 Prêt — lancez le backend avec :")
    print(f"   uvicorn app.main:app --reload --port 8000")


# ════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Doctor Smile — Entraînement des modèles ML",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Plans disponibles :
  standard  →  RF + XGBoost                          (2 modèles)
  premium   →  RF + XGBoost + LightGBM               (3 modèles)
  extra     →  RF + XGBoost + LightGBM + Meta Stack  (4 modèles)

Exemples :
  python train_models.py --data data.csv --plan standard
  python train_models.py --data data.csv --plan premium
  python train_models.py --data data.csv --plan extra
        """,
    )
    parser.add_argument("--data", default="data.csv",
                        help="Chemin vers le CSV d'entraînement (défaut: data.csv)")
    parser.add_argument("--plan", default="standard",
                        choices=["standard", "premium", "extra"],
                        help="Plan à entraîner (défaut: standard)")
    args = parser.parse_args()
    main(args.data, args.plan)