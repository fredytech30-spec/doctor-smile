"""
ROUTER — monitoring.py v4.0
Surveillance Continue - Doctor Smile
════════════════════════════════════════════════════════════════

POST /monitoring/metrics → Enregistrer métrique
GET  /monitoring/metrics → Récupérer métriques
GET  /monitoring/alerts → Récupérer alertes
POST /monitoring/alerts/{id}/resolve → Résoudre alerte
GET  /monitoring/health → État santé système

NOUVEAU v4.0 :
  - Surveillance continue du système
  - Alertes proactives sur anomalies
  - Métriques de performance
════════════════════════════════════════════════════════════════
"""

from __future__ import annotations
import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.middleware.firebase_verify import verify_token
from app.services.monitoring_service import monitoring_service

log = logging.getLogger("doctorsmile.router.monitoring")
router = APIRouter(prefix="/monitoring", tags=["Monitoring"])


# ── Schemas ──────────────────────────────────────────────────

class RecordMetricRequest(BaseModel):
    metricName: str = Field(..., min_length=1)
    value: float
    timestamp: str | None = None


# ════════ POST /monitoring/metrics ════════════════════════════════════

@router.post("/metrics", status_code=200,
    summary="Enregistrer métrique")
async def record_metric(
    body: RecordMetricRequest,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Enregistre une métrique de performance.
    """
    try:
        result = monitoring_service.record_metric(
            metric_name=body.metricName,
            value=body.value,
            timestamp=body.timestamp
        )
        
        return result
        
    except Exception as e:
        log.error(f"[Monitoring] Erreur enregistrement métrique: {e}")
        raise HTTPException(500, "Erreur lors de l'enregistrement de la métrique")


# ════════ GET /monitoring/metrics ════════════════════════════════════

@router.get("/metrics", status_code=200,
    summary="Récupérer métriques")
async def get_metrics(
    token: dict = Depends(verify_token),
    metric_name: str | None = None,
    hours: int = 24
) -> dict[str, Any]:
    """
    Récupère les métriques de performance.
    """
    try:
        result = monitoring_service.get_metrics(
            metric_name=metric_name,
            hours=hours
        )
        
        return result
        
    except Exception as e:
        log.error(f"[Monitoring] Erreur récupération métriques: {e}")
        raise HTTPException(500, "Erreur lors de la récupération des métriques")


# ════════ GET /monitoring/alerts ════════════════════════════════════

@router.get("/alerts", status_code=200,
    summary="Récupérer alertes")
async def get_alerts(
    token: dict = Depends(verify_token),
    severity: str | None = None,
    resolved: bool | None = None,
    limit: int = 50
) -> dict[str, Any]:
    """
    Récupère les alertes système.
    """
    try:
        alerts = monitoring_service.get_alerts(
            severity=severity,
            resolved=resolved,
            limit=limit
        )
        
        return {
            "alerts": alerts,
            "count": len(alerts),
            "limit": limit
        }
        
    except Exception as e:
        log.error(f"[Monitoring] Erreur récupération alertes: {e}")
        raise HTTPException(500, "Erreur lors de la récupération des alertes")


# ════════ POST /monitoring/alerts/{id}/resolve ════════════════════════════════════

@router.post("/alerts/{alert_id}/resolve", status_code=200,
    summary="Résoudre alerte")
async def resolve_alert(
    alert_id: str,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Marque une alerte comme résolue.
    """
    try:
        result = monitoring_service.resolve_alert(alert_id)
        
        return result
        
    except Exception as e:
        log.error(f"[Monitoring] Erreur résolution alerte: {e}")
        raise HTTPException(500, "Erreur lors de la résolution de l'alerte")


# ════════ GET /monitoring/health ════════════════════════════════════

@router.get("/health", status_code=200,
    summary="État santé système")
async def get_system_health(
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Récupère l'état de santé global du système.
    """
    try:
        health = monitoring_service.get_system_health()
        
        return health
        
    except Exception as e:
        log.error(f"[Monitoring] Erreur health check: {e}")
        raise HTTPException(500, "Erreur lors du health check")
