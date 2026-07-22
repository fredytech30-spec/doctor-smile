"""
ROUTER — settings.py v4.0
Paramètres Utilisateur - Doctor Smile
════════════════════════════════════════════════════════════════

GET  /settings → Récupérer paramètres
POST /settings → Mettre à jour paramètres
POST /settings/reset → Réinitialiser paramètres
POST /settings/integrations/{name} → Configurer intégration
GET  /settings/integrations/{name} → Récupérer configuration intégration

NOUVEAU v4.0 :
  - Gestion des paramètres utilisateur (thème, langue, affichage)
  - Paramètres d'automatisation
  - Configuration des intégrations tierces
════════════════════════════════════════════════════════════════
"""

from __future__ import annotations
import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.middleware.firebase_verify import verify_token
from app.services.settings_service import settings_service

log = logging.getLogger("doctorsmile.router.settings")
router = APIRouter(prefix="/settings", tags=["Settings"])


# ── Schemas ──────────────────────────────────────────────────

class SettingsRequest(BaseModel):
    theme: str | None = None
    language: str | None = None
    display: dict[str, Any] | None = None
    automation: dict[str, Any] | None = None
    integrations: dict[str, Any] | None = None

class IntegrationConfigRequest(BaseModel):
    config: dict[str, Any]


# ════════ GET /settings ════════════════════════════════════

@router.get("/", status_code=200,
    summary="Récupérer paramètres utilisateur")
async def get_settings(
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Récupère les paramètres de l'utilisateur.
    """
    try:
        uid = token.get("uid", "")
        
        settings = settings_service.get_user_settings(user_id=uid)
        
        return {
            "user_id": uid,
            "settings": settings
        }
        
    except Exception as e:
        log.error(f"[Settings] Erreur récupération paramètres: {e}")
        raise HTTPException(500, "Erreur lors de la récupération des paramètres")


# ════════ POST /settings ════════════════════════════════════

@router.post("/", status_code=200,
    summary="Mettre à jour paramètres utilisateur")
async def update_settings(
    body: SettingsRequest,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Met à jour les paramètres de l'utilisateur.
    """
    try:
        uid = token.get("uid", "")
        
        # Construire le dictionnaire des paramètres à mettre à jour
        settings_update = {}
        if body.theme is not None:
            settings_update["theme"] = body.theme
        if body.language is not None:
            settings_update["language"] = body.language
        if body.display is not None:
            settings_update["display"] = body.display
        if body.automation is not None:
            settings_update["automation"] = body.automation
        if body.integrations is not None:
            settings_update["integrations"] = body.integrations
        
        result = settings_service.update_user_settings(
            user_id=uid,
            settings=settings_update
        )
        
        return result
        
    except Exception as e:
        log.error(f"[Settings] Erreur mise à jour paramètres: {e}")
        raise HTTPException(500, "Erreur lors de la mise à jour des paramètres")


# ════════ POST /settings/reset ════════════════════════════════════

@router.post("/reset", status_code=200,
    summary="Réinitialiser paramètres utilisateur")
async def reset_settings(
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Réinitialise les paramètres de l'utilisateur aux valeurs par défaut.
    """
    try:
        uid = token.get("uid", "")
        
        result = settings_service.reset_user_settings(user_id=uid)
        
        return result
        
    except Exception as e:
        log.error(f"[Settings] Erreur réinitialisation paramètres: {e}")
        raise HTTPException(500, "Erreur lors de la réinitialisation des paramètres")


# ════════ POST /settings/integrations/{name} ════════════════════════════════════

@router.post("/integrations/{integration_name}", status_code=200,
    summary="Configurer intégration")
async def configure_integration(
    integration_name: str,
    body: IntegrationConfigRequest,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Configure une intégration tierce (QuickBooks, Sage, CEGID).
    """
    try:
        uid = token.get("uid", "")
        
        result = settings_service.configure_integration(
            user_id=uid,
            integration=integration_name,
            config=body.config
        )
        
        return result
        
    except Exception as e:
        log.error(f"[Settings] Erreur configuration intégration: {e}")
        raise HTTPException(500, "Erreur lors de la configuration de l'intégration")


# ════════ GET /settings/integrations/{name} ════════════════════════════════════

@router.get("/integrations/{integration_name}", status_code=200,
    summary="Récupérer configuration intégration")
async def get_integration_config(
    integration_name: str,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Récupère la configuration d'une intégration tierce.
    """
    try:
        uid = token.get("uid", "")
        
        result = settings_service.get_integration_config(
            user_id=uid,
            integration=integration_name
        )
        
        return result
        
    except Exception as e:
        log.error(f"[Settings] Erreur récupération configuration intégration: {e}")
        raise HTTPException(500, "Erreur lors de la récupération de la configuration")
