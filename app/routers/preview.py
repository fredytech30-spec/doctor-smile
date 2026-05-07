"""
ROUTER — preview.py
DOCTOR SMILE
POST /preview-transform → preview des transformations preprocessing SANS lancer le ML

Corrections vs version originale :
  - Delègue a preprocessing_service (pas de logique dupliquee)
  - JWT verify_token ajoute
  - Retourne aussi les ratios calcules (feature values)
  - scale_numerical_features corrige (utilise les medianes de reference)
  - winsorize corrige (seuils fixes, pas IQR sur 1 ligne)
"""
from __future__ import annotations
import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.middleware.firebase_verify import verify_token
from app.services.preprocessing_service import preprocessing_service, MEDIANS_REFERENCE

log    = logging.getLogger("doctorsmile.router.preview")
router = APIRouter(prefix="/preview-transform", tags=["Preview"])

class PreviewRequest(BaseModel):
    data: list[dict[str, Any]]
    options: dict[str, bool] = {}

class PreviewResponse(BaseModel):
    success:               bool
    transformationsApplied: list[str]
    ratiosComputed:        dict[str, float | None]
    normalizedColumns:     dict[str, str]   # {original: cle_interne}
    preview:               list[dict[str, Any]]
    warnings:              list[str]


# ════════ POST /preview-transform ════════════════════════════════

@router.post("", response_model=PreviewResponse, status_code=200,
    summary="Apercu des transformations preprocessing SANS lancer le pipeline ML")
async def preview_transform(
    request: PreviewRequest,
    token:   dict = Depends(verify_token),
) -> PreviewResponse:
    """
    Permet a l utilisateur de voir comment ses donnees seront transformees
    avant de lancer l analyse :
    
    1. Normalisation des colonnes (FR/EN → cles internes via COL_ALIASES)
    2. Calcul des 16 ratios financiers a partir des donnees brutes
    3. Imputation des NaN par medianes sectorielles
    4. Winsorisation seuils fixes
    5. Mise en evidence des valeurs imputees vs presentes

    Ne touche PAS aux modeles ML ni a Firestore.
    Retourne les ratios calcules pour l affichage dans le dashboard.
    """
    if not request.data:
        raise HTTPException(422, "Le champ data est vide.")

    transformations: list[str] = []
    warnings_list:   list[str] = []

    # Etape 1 : normalisation des colonnes
    agg = preprocessing_service._normalize_and_aggregate(request.data)
    transformations.append("Normalisation des noms de colonnes (FR/EN → cles internes)")

    # Construire le mapping col_originale → cle_interne
    from app.services.preprocessing_service import COL_ALIASES
    import unicodedata
    def norm(k: str) -> str:
        n = unicodedata.normalize("NFD", k)
        n = "".join(c for c in n if unicodedata.category(c) != "Mn")
        return n.lower().strip().replace(" ", "_").replace("'", "_")

    col_map: dict[str, str] = {}
    for raw_key in (request.data[0] if request.data else {}):
        n = norm(raw_key)
        col_map[raw_key] = COL_ALIASES.get(n, n)

    # Etape 2 : calcul des ratios
    raw_features = preprocessing_service._compute_numeric_features(agg)
    transformations.append("Calcul de 16 ratios financiers (liquidite, rentabilite, solvabilite...)")

    # Identifier les valeurs imputees
    import numpy as np
    ratios_display: dict[str, float | None] = {}
    imputed: list[str] = []

    for key, val in raw_features.items():
        if np.isnan(val):
            ratios_display[key] = MEDIANS_REFERENCE.get(key)
            imputed.append(key)
        else:
            ratios_display[key] = round(float(val), 4)

    if imputed:
        transformations.append(f"Imputation NaN par medianes de reference : {', '.join(imputed)}")
        warnings_list.append(
            f"{len(imputed)} ratio(s) calcule(s) par imputation "
            f"(donnee source manquante) : {', '.join(imputed[:5])}"
        )

    # Etape 3 : winsorisation
    clipped = preprocessing_service._winsorize(raw_features)
    winsorized = [k for k in clipped if ratios_display.get(k) != clipped[k]]
    if winsorized:
        transformations.append(f"Winsorisation de {len(winsorized)} valeur(s) hors plage")

    # Preview : 5 premieres lignes avec colonnes normalisees
    preview_rows = []
    for row in request.data[:5]:
        new_row: dict[str, Any] = {}
        for raw_key, val in row.items():
            internal = col_map.get(raw_key, raw_key)
            new_row[internal] = val
        preview_rows.append(new_row)

    if preview_rows:
        transformations.append("Renommage des colonnes vers les cles internes")

    log.info("[POST /preview-transform] %d lignes, %d ratios calcules, %d imputes",
             len(request.data), len(ratios_display), len(imputed))

    return PreviewResponse(
        success=True,
        transformationsApplied=transformations,
        ratiosComputed=ratios_display,
        normalizedColumns=col_map,
        preview=preview_rows,
        warnings=warnings_list,
    )