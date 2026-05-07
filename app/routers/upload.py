"""
ROUTER — upload.py
DOCTOR SMILE
POST /upload               → parse CSV/Excel → retourne data[] complet pour sendToAPI()
POST /upload/detect-columns → detecte les colonnes financieres reconnues

Corrections vs version originale :
  - Retourne les data[] completes (pas seulement preview 5 lignes)
  - Normalise les noms de colonnes via COL_ALIASES (FR/EN)
  - Detecte automatiquement les colonnes financieres reconnues
  - JWT verify_token ajoute
  - upload/validate-structure supprime (redondant avec validate.py)
"""
from __future__ import annotations
import io, logging
from typing import Any
import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from app.middleware.firebase_verify import verify_token
from app.services.preprocessing_service import COL_ALIASES

log    = logging.getLogger("doctorsmile.router.upload")
router = APIRouter(prefix="/upload", tags=["Upload"])

ALLOWED_EXTENSIONS = {"csv", "xlsx", "xls"}
MAX_ROWS = 5000

class UploadResponse(BaseModel):
    success:              bool
    filename:             str
    rowCount:             int
    columnCount:          int
    columnsOriginal:      list[str]
    columnsRecognized:    list[str]   # colonnes financieres detectees
    columnsUnknown:       list[str]   # colonnes non reconnues
    completeness:         float       # % de colonnes financieres presentes
    data:                 list[dict[str, Any]]  # toutes les lignes pour sendToAPI()
    preview:              list[dict[str, Any]]  # 5 premieres lignes pour UI
    message:              str


# ════════ POST /upload ════════════════════════════════════════════

@router.post("", response_model=UploadResponse, status_code=200,
    summary="Uploader un fichier CSV/Excel et obtenir les donnees parsees")
async def upload_file(
    file:    UploadFile = File(...),
    userId:  str        = Form(None),
    token:   dict       = Depends(verify_token),
) -> UploadResponse:
    """
    Parse un fichier CSV ou Excel.
    Retourne :
    - data[]    : toutes les lignes → passe directement a sendToAPI()
    - preview[] : 5 premieres lignes pour l affichage
    - columnsRecognized : colonnes financieres detectees (via COL_ALIASES)
    - completeness : % de features financieres presentes

    Limite : 5000 lignes max.
    Le frontend utilise data[] dans JSON.stringify({ filename, data, userId, plan }).
    """
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(422,
            f"Format non supporte ({ext}). Utilisez CSV, XLSX ou XLS.")

    content = await file.read()
    if not content:
        raise HTTPException(422, "Fichier vide.")

    # Parse
    try:
        if ext == "csv":
            # Essayer plusieurs encodages
            for enc in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
                try:
                    df = pd.read_csv(io.BytesIO(content), encoding=enc, sep=None,
                                     engine="python", dtype=str)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                raise HTTPException(422, "Encodage du CSV non supporte.")
        else:
            df = pd.read_excel(io.BytesIO(content), dtype=str)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(422, f"Erreur lecture fichier : {exc}")

    if df.empty:
        raise HTTPException(422, "Le fichier ne contient aucune donnee.")

    if len(df) > MAX_ROWS:
        log.warning("[POST /upload] Troncature : %d → %d lignes", len(df), MAX_ROWS)
        df = df.head(MAX_ROWS)

    # Nettoyer les noms de colonnes
    df.columns = df.columns.str.strip().str.strip()

    # Remplacer NaN par None
    df = df.where(pd.notna(df), None)

    records = df.to_dict(orient="records")

    # Detecter les colonnes reconnues via COL_ALIASES
    cols_original   = df.columns.tolist()
    cols_lower_map  = {c.lower().strip().replace(" ", "_"): c for c in cols_original}
    cols_recognized = []
    cols_unknown    = []

    for col in cols_original:
        normalized = col.lower().strip().replace(" ", "_").replace("'", "_")
        if normalized in COL_ALIASES:
            cols_recognized.append(col)
        else:
            cols_unknown.append(col)

    # Completeness : combien de features financieres sont presentes
    target_features = 16  # NUMERIC_FEATURES count
    completeness = round(min(100.0, len(cols_recognized) / target_features * 100), 1)

    log.info("[POST /upload] user=%s file=%s rows=%d recognized=%d/%d completeness=%.0f%%",
             userId, file.filename, len(records),
             len(cols_recognized), len(cols_original), completeness)

    return UploadResponse(
        success=True,
        filename=file.filename,
        rowCount=len(records),
        columnCount=len(cols_original),
        columnsOriginal=cols_original,
        columnsRecognized=cols_recognized,
        columnsUnknown=cols_unknown,
        completeness=completeness,
        data=records,
        preview=records[:5],
        message=f"Fichier '{file.filename}' parse avec succes ({len(records)} lignes).",
    )


# ════════ POST /upload/detect-columns ════════════════════════════

@router.post("/detect-columns", status_code=200,
    summary="Detecter les colonnes financieres dans un fichier sans le parser completement")
async def detect_columns(
    file:  UploadFile = File(...),
    token: dict       = Depends(verify_token),
) -> dict[str, Any]:
    """
    Lit uniquement la premiere ligne du fichier (headers).
    Retourne la liste des colonnes reconnues vs inconnues.
    Beaucoup plus rapide que POST /upload pour de gros fichiers.
    Utile pour valider le format avant l upload complet.
    """
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(422, f"Format non supporte ({ext}).")

    content = await file.read()
    if not content:
        raise HTTPException(422, "Fichier vide.")

    try:
        if ext == "csv":
            for enc in ("utf-8", "utf-8-sig", "latin-1"):
                try:
                    df = pd.read_csv(io.BytesIO(content), encoding=enc, nrows=0)
                    break
                except UnicodeDecodeError:
                    continue
        else:
            df = pd.read_excel(io.BytesIO(content), nrows=0)
    except Exception as exc:
        raise HTTPException(422, f"Erreur lecture headers : {exc}")

    cols = df.columns.str.strip().tolist()
    recognized, unknown = [], []

    for col in cols:
        norm = col.lower().strip().replace(" ", "_").replace("'", "_")
        (recognized if norm in COL_ALIASES else unknown).append(col)

    return {
        "filename":           file.filename,
        "totalColumns":       len(cols),
        "columnsRecognized":  recognized,
        "columnsUnknown":     unknown,
        "completeness":       round(min(100.0, len(recognized) / 16 * 100), 1),
        "readyForAnalysis":   len(recognized) >= 5,
        "message": (
            f"{len(recognized)} colonnes financieres detectees sur {len(cols)}. "
            + ("Pret pour l analyse." if len(recognized) >= 5
               else "Ajouter au moins 5 colonnes financieres.")
        ),
    }