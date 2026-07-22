"""
ROUTER — notifications.py v4.0
Notifications Multi-canal - Doctor Smile
════════════════════════════════════════════════════════════════

POST /notifications/send → Envoyer notification
POST /notifications/proactive → Notification proactive
GET  /notifications/history → Historique notifications
POST /notifications/{id}/read → Marquer comme lu
POST /notifications/read-all → Tout marquer comme lu
POST /notifications/preferences → Mettre à jour préférences
GET  /notifications/preferences → Récupérer préférences

NOUVEAU v4.0 :
  - Notifications multi-canal (WhatsApp, SMS, Email, In-app)
  - Notifications proactives basées sur événements
  - Gestion des préférences utilisateur
════════════════════════════════════════════════════════════════
"""

from __future__ import annotations
import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.middleware.firebase_verify import verify_token
from app.services.notification_service import notification_service, NotificationChannel, NotificationPriority

log = logging.getLogger("doctorsmile.router.notifications")
router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ── Schemas ──────────────────────────────────────────────────

class SendNotificationRequest(BaseModel):
    userId: str = Field(..., min_length=5)
    channel: str = Field(..., pattern="^(whatsapp|sms|email|in_app)$")
    message: str = Field(..., min_length=1, max_length=500)
    priority: str = Field(default="medium", pattern="^(low|medium|high|urgent)$")
    metadata: dict[str, Any] | None = None

class ProactiveNotificationRequest(BaseModel):
    userId: str = Field(..., min_length=5)
    eventType: str = Field(..., min_length=1)
    analysisData: dict[str, Any]

class NotificationPreferences(BaseModel):
    whatsapp_enabled: bool = True
    sms_enabled: bool = False
    email_enabled: bool = True
    in_app_enabled: bool = True
    proactive_alerts: bool = True
    daily_digest: bool = False
    weekly_report: bool = True


# ════════ POST /notifications/send ════════════════════════════════════

@router.post("/send", status_code=200,
    summary="Envoyer notification")
async def send_notification(
    body: SendNotificationRequest,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Envoie une notification via un canal spécifique.
    """
    try:
        uid = token.get("uid", "")
        if uid and uid != "dev-uid-000" and uid != body.userId:
            raise HTTPException(403, "userId ne correspond pas au token Firebase")
        
        # Conversion channel string vers enum
        channel_map = {
            "whatsapp": NotificationChannel.WHATSAPP,
            "sms": NotificationChannel.SMS,
            "email": NotificationChannel.EMAIL,
            "in_app": NotificationChannel.IN_APP
        }
        
        # Conversion priority string vers enum
        priority_map = {
            "low": NotificationPriority.LOW,
            "medium": NotificationPriority.MEDIUM,
            "high": NotificationPriority.HIGH,
            "urgent": NotificationPriority.URGENT
        }
        
        result = notification_service.send_notification(
            user_id=body.userId,
            channel=channel_map.get(body.channel, NotificationChannel.IN_APP),
            message=body.message,
            priority=priority_map.get(body.priority, NotificationPriority.MEDIUM),
            metadata=body.metadata
        )
        
        return result
        
    except Exception as e:
        log.error(f"[Notifications] Erreur envoi notification: {e}")
        raise HTTPException(500, "Erreur lors de l'envoi de la notification")


# ════════ POST /notifications/proactive ════════════════════════════════════

@router.post("/proactive", status_code=200,
    summary="Notification proactive")
async def send_proactive_notification(
    body: ProactiveNotificationRequest,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Envoie une notification proactive basée sur un événement financier.
    """
    try:
        uid = token.get("uid", "")
        if uid and uid != "dev-uid-000" and uid != body.userId:
            raise HTTPException(403, "userId ne correspond pas au token Firebase")
        
        result = notification_service.send_proactive_notification(
            user_id=body.userId,
            event_type=body.eventType,
            analysis_data=body.analysisData
        )
        
        return result
        
    except Exception as e:
        log.error(f"[Notifications] Erreur notification proactive: {e}")
        raise HTTPException(500, "Erreur lors de l'envoi de la notification proactive")


# ════════ GET /notifications/history ════════════════════════════════════

@router.get("/history", status_code=200,
    summary="Historique notifications")
async def get_notification_history(
    token: dict = Depends(verify_token),
    limit: int = 50
) -> dict[str, Any]:
    """
    Récupère l'historique des notifications de l'utilisateur.
    """
    try:
        uid = token.get("uid", "")
        
        history = notification_service.get_notification_history(
            user_id=uid,
            limit=limit
        )
        
        return {
            "user_id": uid,
            "notifications": history,
            "count": len(history),
            "limit": limit
        }
        
    except Exception as e:
        log.error(f"[Notifications] Erreur récupération historique: {e}")
        raise HTTPException(500, "Erreur lors de la récupération de l'historique")


# ════════ POST /notifications/{id}/read ════════════════════════════════════

@router.post("/{notification_id}/read", status_code=200,
    summary="Marquer notification comme lue")
async def mark_notification_as_read(
    notification_id: str,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Marque une notification comme lue.
    """
    try:
        uid = token.get("uid", "")
        
        # Simulation (à remplacer par Firestore)
        return {
            "notification_id": notification_id,
            "user_id": uid,
            "status": "read"
        }
        
    except Exception as e:
        log.error(f"[Notifications] Erreur marquer comme lu: {e}")
        raise HTTPException(500, "Erreur lors du marquage comme lu")


# ════════ POST /notifications/read-all ════════════════════════════════════

@router.post("/read-all", status_code=200,
    summary="Tout marquer comme lu")
async def mark_all_as_read(
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Marque toutes les notifications comme lues.
    """
    try:
        uid = token.get("uid", "")
        
        # Simulation (à remplacer par Firestore)
        return {
            "user_id": uid,
            "status": "all_read"
        }
        
    except Exception as e:
        log.error(f"[Notifications] Erreur marquer tout comme lu: {e}")
        raise HTTPException(500, "Erreur lors du marquage tout comme lu")


# ════════ POST /notifications/preferences ════════════════════════════════════

@router.post("/preferences", status_code=200,
    summary="Mettre à jour préférences")
async def update_notification_preferences(
    preferences: NotificationPreferences,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Met à jour les préférences de notification de l'utilisateur.
    """
    try:
        uid = token.get("uid", "")
        
        result = notification_service.set_user_preferences(
            user_id=uid,
            preferences=preferences.dict()
        )
        
        return result
        
    except Exception as e:
        log.error(f"[Notifications] Erreur mise à jour préférences: {e}")
        raise HTTPException(500, "Erreur lors de la mise à jour des préférences")


# ════════ GET /notifications/preferences ════════════════════════════════════

@router.get("/preferences", status_code=200,
    summary="Récupérer préférences")
async def get_notification_preferences(
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Récupère les préférences de notification de l'utilisateur.
    """
    try:
        uid = token.get("uid", "")
        
        # Récupérer depuis settings_service ou notification_service
        # Simulation pour l'instant
        default_preferences = {
            "whatsapp_enabled": True,
            "sms_enabled": False,
            "email_enabled": True,
            "in_app_enabled": True,
            "proactive_alerts": True,
            "daily_digest": False,
            "weekly_report": True
        }
        
        return {
            "user_id": uid,
            "preferences": default_preferences
        }
        
    except Exception as e:
        log.error(f"[Notifications] Erreur récupération préférences: {e}")
        raise HTTPException(500, "Erreur lors de la récupération des préférences")
