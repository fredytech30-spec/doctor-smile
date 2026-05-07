"""
ROUTER — validate.py
DOCTOR SMILE
POST /validate → rapport de qualite des donnees avant analyse

Corrections vs version originale :
  - REQUIRED_COLUMNS utilise nos aliases FR/EN via COL_ALIASES
  - VALUE_RANGES en valeurs reelles (% non normalises)
  - JWT verify_token ajoute
  - Normalisation des noms de colonnes avant validation
  - Ajout completeness_score par colonne
  - Detection colonnes reconnues vs inconnues
"""
from __future__ import annotations
import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.middleware.firebase_verify import verify_token
from app.services.preprocessing_service import COL_ALIASES, MEDIANS_REFERENCE

log    = logging.getLogger("doctorsmile.router.validate")
router = APIRouter(prefix="/validate", tags=["Validation"])

# ── Colonnes minimales (clés internes apres normalisation) ────────
REQUIRED_INTERNAL = [
    "actif_courant", "passif_courant",
    "chiffre_affaires", "resultat_net",
    "capitaux_propres", "actif_total", "dettes_totales",
]

STRONGLY_RECOMMENDED = [
    "tresorerie", "stocks", "ebitda", "marge_brute",
    "bfr", "charges_financieres", "resultat_exploitation",
    "annees_activite",
]

# ── Plages de valeurs (unites reelles : euros, %, ratio) ──────────
# Les valeurs viennent du frontend en unites reelles
# Ex : CA en euros, marges en %, ratios sans unite
VALUE_RANGES: dict[str, tuple[float, float, str]] = {
    # (min, max, unit)
    "current_ratio":       (0.0,   20.0,  "ratio"),
    "quick_ratio":         (0.0,   20.0,  "ratio"),
    "cash_ratio":          (0.0,   10.0,  "ratio"),
    "debt_equity":         (-2.0,  50.0,  "ratio"),
    "solvabilite":         (-100.0, 100.0, "%"),
    "roa":                 (-100.0, 100.0, "%"),
    "roe":                 (-200.0, 200.0, "%"),
    "ebitda_margin":       (-100.0, 100.0, "%"),
    "net_margin":          (-100.0, 100.0, "%"),
    "marge_brute_pct":     (-50.0,  100.0, "%"),
    "rotation_actifs":     (0.0,    20.0,  "ratio"),
    "bfr_ca":              (-100.0, 200.0, "%"),
    "couverture_interets": (-50.0,  200.0, "ratio"),
    "annees_activite":     (0.0,    200.0, "ans"),
    "altman_z":            (-20.0,  20.0,  "score"),
}

# Valeurs enum valides
VALID_CATEGORICALS: dict[str, list[str]] = {
    "secteur": ["Tech", "Industrie", "Retail", "Immobilier", "Sante",
                "Finance", "Agro", "Transport", "Energie", "Media", "Autre"],
    "taille":  ["Micro", "PME", "ETI", "Grand Groupe"],
    "pays":    ["France", "Belgique", "Suisse", "Maroc", "Senegal",
                "Cote d Ivoire", "Canada", "Luxembourg", "Autre"],
}

class ValidationError(BaseModel):
    row:      int
    column:   str
    message:  str
    severity: str  # error | warning | info

class ValidateRequest(BaseModel):
    data: list[dict[str, Any]]

class ValidateResponse(BaseModel):
    valid:           bool
    rowCount:        int
    columnCount:     int
    errors:          list[ValidationError]
    warnings:        list[ValidationError]
    summary:         dict[str, Any]
    columnReport:    list[dict[str, Any]]  # rapport par colonne


# ════════ POST /validate ══════════════════════════════════════════

@router.post("", response_model=ValidateResponse, status_code=200,
    summary="Rapport de qualite des donnees financieres avant analyse ML")
async def validate_data(
    request: ValidateRequest,
    token:   dict = Depends(verify_token),
) -> ValidateResponse:
    """
    Valide la qualite des donnees avant de lancer le pipeline ML.
    
    Controles effectues :
    - Colonnes obligatoires presentes
    - Valeurs numeriques dans les plages attendues
    - Valeurs categoriques valides (secteur, taille, pays)
    - Coherence entre ratios (quick <= current)
    - Valeurs manquantes par colonne
    - Score de completude global

    Retourne errors (bloquants) + warnings (non bloquants) + summary.
    """
    data = request.data
    if not data:
        raise HTTPException(422, "Le champ data est vide.")

    log.info("[POST /validate] %d lignes a valider", len(data))

    # Normaliser les noms de colonnes via COL_ALIASES
    import unicodedata
    def normalize_key(raw: str) -> str:
        n = unicodedata.normalize("NFD", raw)
        n = "".join(c for c in n if unicodedata.category(c) != "Mn")
        return n.lower().strip().replace(" ", "_").replace("'", "_")

    errors:   list[ValidationError] = []
    warnings: list[ValidationError] = []

    # Colonnes presentes dans le dataset (normalisees)
    raw_cols   = list(data[0].keys()) if data else []
    col_map    = {normalize_key(c): c for c in raw_cols}   # normalise → original
    int_cols   = set(col_map.keys())                        # cles internes presentes

    # ── Colonnes manquantes obligatoires ─────────────────────────
    missing_required = [c for c in REQUIRED_INTERNAL if c not in int_cols]
    missing_recommended = [c for c in STRONGLY_RECOMMENDED if c not in int_cols]

    if missing_required:
        errors.append(ValidationError(
            row=0, column="*",
            message=f"Colonnes obligatoires manquantes : {', '.join(missing_required)}",
            severity="error",
        ))
    if missing_recommended:
        warnings.append(ValidationError(
            row=0, column="*",
            message=f"Colonnes recommandees manquantes : {', '.join(missing_recommended)} "
                    f"(imputation par medianes sectorielles)",
            severity="warning",
        ))

    # ── Validation ligne par ligne ────────────────────────────────
    for row_idx, row in enumerate(data[:500], 1):   # max 500 lignes verifiees
        norm_row = {normalize_key(k): v for k, v in row.items()}

        # Valeurs manquantes sur colonnes obligatoires
        for col in REQUIRED_INTERNAL:
            if norm_row.get(col) is None or norm_row.get(col) == "":
                errors.append(ValidationError(
                    row=row_idx, column=col,
                    message="Valeur obligatoire manquante",
                    severity="error",
                ))

        # Plages numeriques
        for col, (lo, hi, unit) in VALUE_RANGES.items():
            val = norm_row.get(col)
            if val is None or val == "":
                continue
            try:
                v = float(str(val).replace(",", ".").replace(" ", "").replace("%", ""))
                if v < lo:
                    warnings.append(ValidationError(
                        row=row_idx, column=col,
                        message=f"Valeur {v} ({unit}) sous le minimum attendu {lo}",
                        severity="warning",
                    ))
                elif v > hi:
                    warnings.append(ValidationError(
                        row=row_idx, column=col,
                        message=f"Valeur {v} ({unit}) au-dessus du maximum attendu {hi}",
                        severity="warning",
                    ))
            except (ValueError, TypeError):
                errors.append(ValidationError(
                    row=row_idx, column=col,
                    message=f"Valeur non numerique : {val!r}",
                    severity="error",
                ))

        # Coherence quick_ratio <= current_ratio
        try:
            qr = float(norm_row.get("quick_ratio") or 0)
            cr = float(norm_row.get("current_ratio") or 0)
            if qr > 0 and cr > 0 and qr > cr:
                errors.append(ValidationError(
                    row=row_idx, column="quick_ratio",
                    message=f"Quick ratio ({qr}) > current ratio ({cr}) — incohérence",
                    severity="error",
                ))
        except (ValueError, TypeError):
            pass

        # Categoriques
        import unicodedata as _ud
        for col, valid_vals in VALID_CATEGORICALS.items():
            val = norm_row.get(col)
            if not val:
                continue
            val_norm = "".join(
                c for c in _ud.normalize("NFD", str(val))
                if _ud.category(c) != "Mn"
            ).strip()
            valid_norm = [
                "".join(c for c in _ud.normalize("NFD", v) if _ud.category(c) != "Mn")
                for v in valid_vals
            ]
            if val_norm not in valid_norm:
                warnings.append(ValidationError(
                    row=row_idx, column=col,
                    message=f"Valeur {val!r} non reconnue. Options : {valid_vals}",
                    severity="warning",
                ))

    # ── Rapport par colonne ───────────────────────────────────────
    column_report = []
    for raw_col in raw_cols:
        norm = normalize_key(raw_col)
        internal = COL_ALIASES.get(norm, norm)
        values   = [row.get(raw_col) for row in data]
        missing  = sum(1 for v in values if v is None or v == "")
        completeness = round((len(data) - missing) / len(data) * 100, 1) if data else 0.0
        is_known = norm in COL_ALIASES

        column_report.append({
            "original":     raw_col,
            "internal":     internal,
            "recognized":   is_known,
            "missing":      missing,
            "completeness": completeness,
            "median":       MEDIANS_REFERENCE.get(internal),
        })

    # ── Summary ───────────────────────────────────────────────────
    total_cells  = len(data) * len(raw_cols) if raw_cols else 1
    n_recognized = sum(1 for r in column_report if r["recognized"])
    n_missing_total = sum(r["missing"] for r in column_report)

    quality_score = max(0.0, round(
        100.0 - (len(errors) * 3 + len(warnings) * 0.5) * 100.0 / max(total_cells, 1),
        1
    ))

    summary = {
        "totalRows":           len(data),
        "totalColumns":        len(raw_cols),
        "columnsRecognized":   n_recognized,
        "columnsUnknown":      len(raw_cols) - n_recognized,
        "totalErrors":         len(errors),
        "totalWarnings":       len(warnings),
        "missingValues":       n_missing_total,
        "completeness":        round((total_cells - n_missing_total) / total_cells * 100, 1),
        "qualityScore":        quality_score,
        "readyForAnalysis":    len(errors) == 0,
        "missingRequired":     missing_required,
        "missingRecommended":  missing_recommended,
    }

    is_valid = len(errors) == 0
    log.info("[POST /validate] valid=%s errors=%d warnings=%d quality=%.0f%%",
             is_valid, len(errors), len(warnings), quality_score)

    return ValidateResponse(
        valid=is_valid,
        rowCount=len(data),
        columnCount=len(raw_cols),
        errors=errors[:100],
        warnings=warnings[:100],
        summary=summary,
        columnReport=column_report,
    )