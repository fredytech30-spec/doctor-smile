"""
ROUTER — realtime.py v4.0
Mises à jour Temps Réel - Doctor Smile
════════════════════════════════════════════════════════════════

POST /realtime/subscribe → S'abonner aux mises à jour
POST /realtime/unsubscribe → Se désabonner
POST /realtime/broadcast → Diffuser mise à jour
GET  /realtime/connections → Connexions actives

NOUVEAU v4.0 :
  - Synchronisation temps réel via Firebase/WebSocket
  - Abonnement aux topics (analyses, notifications, marketplace)
  - Diffusion ciblée ou globale
════════════════════════════════════════════════════════════════
"""

from __future__ import annotations
import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.middleware.firebase_verify import verify_token
from app.services.realtime_service import realtime_service

log = logging.getLogger("doctorsmile.router.realtime")
router = APIRouter(prefix="/realtime", tags=["Realtime"])


# ── Schemas ──────────────────────────────────────────────────

class SubscribeRequest(BaseModel):
    userId: str = Field(..., min_length=5)
    topics: list[str] = Field(..., min_items=1)

class UnsubscribeRequest(BaseModel):
    userId: str = Field(..., min_length=5)

class BroadcastRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    data: dict[str, Any]
    targetUsers: list[str] | None = None


# ════════ POST /realtime/subscribe ════════════════════════════════════

@router.post("/subscribe", status_code=200,
    summary="S'abonner aux mises à jour temps réel")
async def subscribe_to_updates(
    body: SubscribeRequest,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Abonne un utilisateur aux mises à jour temps réel.
    """
    try:
        uid = token.get("uid", "")
        if uid and uid != "dev-uid-000" and uid != body.userId:
            raise HTTPException(403, "userId ne correspond pas au token Firebase")
        
        result = realtime_service.subscribe_to_updates(
            user_id=body.userId,
            topics=body.topics
        )
        
        return result
        
    except Exception as e:
        log.error(f"[Realtime] Erreur abonnement: {e}")
        raise HTTPException(500, "Erreur lors de l'abonnement")


# ════════ POST /realtime/unsubscribe ════════════════════════════════════

@router.post("/unsubscribe", status_code=200,
    summary="Se désabonner des mises à jour")
async def unsubscribe_from_updates(
    body: UnsubscribeRequest,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Désabonne un utilisateur des mises à jour temps réel.
    """
    try:
        uid = token.get("uid", "")
        if uid and uid != "dev-uid-000" and uid != body.userId:
            raise HTTPException(403, "userId ne correspond pas au token Firebase")
        
        result = realtime_service.unsubscribe_from_updates(user_id=body.userId)
        
        return result
        
    except Exception as e:
        log.error(f"[Realtime] Erreur désabonnement: {e}")
        raise HTTPException(500, "Erreur lors du désabonnement")


# ════════ POST /realtime/broadcast ════════════════════════════════════

@router.post("/broadcast", status_code=200,
    summary="Diffuser mise à jour")
async def broadcast_update(
    body: BroadcastRequest,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Diffuse une mise à jour aux utilisateurs abonnés.
    """
    try:
        result = realtime_service.broadcast_update(
            topic=body.topic,
            data=body.data,
            target_users=body.targetUsers
        )
        
        return result
        
    except Exception as e:
        log.error(f"[Realtime] Erreur diffusion: {e}")
        raise HTTPException(500, "Erreur lors de la diffusion")


# ════════ GET /realtime/connections ════════════════════════════════════

@router.get("/connections", status_code=200,
    summary="Connexions actives")
async def get_active_connections(
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Récupère les connexions actives.
    """
    try:
        connections = realtime_service.get_active_connections()
        
        return connections
        
    except Exception as e:
        log.error(f"[Realtime] Erreur récupération connexions: {e}")
        raise HTTPException(500, "Erreur lors de la récupération des connexions")
