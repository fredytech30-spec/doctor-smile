
"""
ROUTER — integration.py
DOCTOR SMILE
POST /integration/sage         → import fichier d'export Sage
POST /integration/excel        → import Excel amélioré avec support de feuilles multiples
"""
from __future__ import annotations
import logging
from typing import Any
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from app.middleware.firebase_verify import verify_token
from app.services.integration_service import integration_service

log = logging.getLogger("doctorsmile.router.integration")
router = APIRouter(prefix="/integration", tags=["Intégrations"])


class SageImportResponse(BaseModel):
    success: bool
    filename: str
    source: str
    row_count: int
    column_count: int
    columns_original: list[str]
    columns_recognized: list[str]
    columns_unknown: list[str]
    completeness: float
    data: list[dict[str, Any]]
    preview: list[dict[str, Any]]
    processed_features: dict[str, float] | None
    message: str
    error: str | None = None


class ExcelEnhancedResponse(BaseModel):
    success: bool
    filename: str
    source: str
    sheet_used: str | None
    available_sheets: list[str] | None
    row_count: int
    column_count: int
    columns_original: list[str]
    columns_recognized: list[str]
    columns_unknown: list[str]
    completeness: float
    data: list[dict[str, Any]]
    preview: list[dict[str, Any]]
    processed_features: dict[str, float] | None
    message: str
    error: str | None = None


@router.post("/sage", response_model=SageImportResponse, status_code=200,
             summary="Importer un fichier d'export Sage (Excel ou CSV)")
async def import_sage(
    file: UploadFile = File(...),
    userId: str = Form(None),
    token: dict = Depends(verify_token),
) -> SageImportResponse:
    """
    Importe un fichier d'export Sage (CSV, XLSX, ou XLS)
    - Détecte automatiquement les colonnes spécifiques à Sage
    - Nettoie et normalise les données
    - Retourne les données prêtes pour l'analyse
    """
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    allowed = {"csv", "xlsx", "xls"}
    if ext not in allowed:
        raise HTTPException(
            422,
            f"Format non supporté ({ext}). Utilisez CSV, XLSX ou XLS pour les exports Sage."
        )

    content = await file.read()
    if not content:
        raise HTTPException(422, "Fichier vide.")

    log.info("[POST /integration/sage] user=%s file=%s", userId, file.filename)

    result = integration_service.import_sage_export(content, file.filename or "sage_export")

    if not result["success"]:
        raise HTTPException(422, result["message"])

    return SageImportResponse(**result)


@router.post("/excel", response_model=ExcelEnhancedResponse, status_code=200,
             summary="Importer un fichier Excel avec support amélioré")
async def import_excel_enhanced(
    file: UploadFile = File(...),
    sheet_name: str = Form(None),
    userId: str = Form(None),
    token: dict = Depends(verify_token),
) -> ExcelEnhancedResponse:
    """
    Importe un fichier Excel avec support amélioré :
    - Détecte automatiquement la feuille avec le plus de données si sheet_name non spécifié
    - Supporte les formats .xlsx et .xls
    - Retourne la liste des feuilles disponibles
    """
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in {"xlsx", "xls"}:
        raise HTTPException(
            422,
            f"Format non supporté ({ext}). Utilisez XLSX ou XLS pour Excel."
        )

    content = await file.read()
    if not content:
        raise HTTPException(422, "Fichier vide.")

    log.info("[POST /integration/excel] user=%s file=%s sheet=%s",
             userId, file.filename, sheet_name)

    result = integration_service.import_excel_enhanced(
        content,
        file.filename or "excel_file",
        sheet_name
    )

    if not result["success"]:
        raise HTTPException(422, result["message"])

    return ExcelEnhancedResponse(**result)


@router.get("/templates/sage", status_code=200,
            summary="Obtenir des informations sur les templates Sage supportés")
async def get_sage_templates(token: dict = Depends(verify_token)) -> dict[str, Any]:
    """
    Retourne la liste des colonnes Sage reconnues et des formats supportés
    """
    from app.services.integration_service import SAGE_COL_ALIASES

    return {
        "supported_formats": ["csv", "xlsx", "xls"],
        "recognized_columns": list(SAGE_COL_ALIASES.keys()),
        "internal_columns": list(SAGE_COL_ALIASES.values()),
        "description": "Importez vos exports Sage directement - Doctor Smile reconnaît automatiquement les colonnes Sage courantes"
    }

