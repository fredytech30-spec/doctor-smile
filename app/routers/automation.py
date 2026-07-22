"""
ROUTER — automation.py v4.0
Automatisation Visible - Doctor Smile
════════════════════════════════════════════════════════════════

POST /automation/create → Créer automatisation
POST /automation/{id}/execute → Exécuter automatisation
GET  /automation/history → Historique automatisations
GET  /automation/active → Automatisations actives

NOUVEAU v4.0 :
  - Automatisation visible avec logs
  - Actions automatisées : relances, alertes, synchronisations
  - Statuts : pending, running, completed, failed
════════════════════════════════════════════════════════════════
"""

from __future__ import annotations
import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.middleware.firebase_verify import verify_token
from app.services.automation_service import automation_service

log = logging.getLogger("doctorsmile.router.automation")
router = APIRouter(prefix="/automation", tags=["Automation"])


# ── Schemas ──────────────────────────────────────────────────

class CreateAutomationRequest(BaseModel):
    userId: str = Field(..., min_length=5)
    automationType: str = Field(..., pattern="^(reminder|alert|sync)$")
    trigger: dict[str, Any]
    config: dict[str, Any]

class ExecuteAutomationRequest(BaseModel):
    automationId: str = Field(..., min_length=1)


# ════════ POST /automation/create ════════════════════════════════════

@router.post("/create", status_code=201,
    summary="Créer automatisation")
async def create_automation(
    body: CreateAutomationRequest,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Crée une nouvelle automatisation.
    """
    try:
        uid = token.get("uid", "")
        if uid and uid != "dev-uid-000" and uid != body.userId:
            raise HTTPException(403, "userId ne correspond pas au token Firebase")
        
        result = automation_service.create_automation(
            user_id=body.userId,
            automation_type=body.automationType,
            trigger=body.trigger,
            config=body.config
        )
        
        return result
        
    except Exception as e:
        log.error(f"[Automation] Erreur création automatisation: {e}")
        raise HTTPException(500, "Erreur lors de la création de l'automatisation")


# ════════ POST /automation/{id}/execute ══════════════════════════════════

@router.post("/{automation_id}/execute", status_code=200,
    summary="Exécuter automatisation")
async def execute_automation(
    automation_id: str,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Exécute une automatisation.
    """
    try:
        uid = token.get("uid", "")
        
        result = automation_service.execute_automation(automation_id)
        
        return result
        
    except Exception as e:
        log.error(f"[Automation] Erreur exécution automatisation: {e}")
        raise HTTPException(500, "Erreur lors de l'exécution de l'automatisation")


# ════════ GET /automation/history ════════════════════════════════════

@router.get("/history", status_code=200,
    summary="Historique automatisations")
async def get_automation_history(
    token: dict = Depends(verify_token),
    limit: int = 50
) -> dict[str, Any]:
    """
    Récupère l'historique des automatisations.
    """
    try:
        uid = token.get("uid", "")
        
        history = automation_service.get_automation_logs(
            user_id=uid,
            limit=limit
        )
        
        return {
            "user_id": uid,
            "automations": history,
            "count": len(history),
            "limit": limit
        }
        
    except Exception as e:
        log.error(f"[Automation] Erreur récupération historique: {e}")
        raise HTTPException(500, "Erreur lors de la récupération de l'historique")


# ════════ GET /automation/active ════════════════════════════════════

@router.get("/active", status_code=200,
    summary="Automatisations actives")
async def get_active_automations(
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Récupère les automatisations actives.
    """
    try:
        uid = token.get("uid", "")
        
        active = automation_service.get_active_automations(user_id=uid)
        
        return {
            "user_id": uid,
            "active_automations": active,
            "count": len(active)
        }
        
    except Exception as e:
        log.error(f"[Automation] Erreur récupération automatisations actives: {e}")
        raise HTTPException(500, "Erreur lors de la récupération des automatisations actives")
