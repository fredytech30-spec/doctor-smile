"""
═══════════════════════════════════════════════════════════════════
ROUTER — analyses_v5.py — Pipeline complet d'analyse
Doctor Smile v5.0

Endpoints:
  POST   /analyses/upload               → Upload + validation + pipeline
  GET    /analyses/{id}                 → Récupérer l'analyse
  POST   /analyses/{id}/feedback         → Feedback utilisateur
  WS     /ws/analysis/{id}               → WebSocket progression temps réel
═══════════════════════════════════════════════════════════════════
"""

from __future__ import annotations
import json
import logging
from typing import Any, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, WebSocket, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.middleware.firebase_verify import verify_token
from app.services.orchestrator_service import orchestrator, ProcessingStage
from app.services.firebase_service import firebase_service

import redis.asyncio as aioredis

log = logging.getLogger("doctorsmile.router.analyses_v5")
router = APIRouter(prefix="/analyses/v5", tags=["Analyses-v5"])


# ════════════════════════════════════════════════════════════════════
#  MODELS
# ════════════════════════════════════════════════════════════════════

class CompanyInfo(BaseModel):
    """Informations entreprise"""
    name: Optional[str] = None
    sector: Optional[str] = None
    country: str = "Cameroon"
    size: Optional[str] = None
    currency: str = "XAF"


class AnalysisUploadRequest(BaseModel):
    """Request body pour upload"""
    filename: str = Field(..., min_length=1, max_length=255)
    company_info: CompanyInfo = CompanyInfo()
    extraction_method: str = Field("auto", pattern="^(auto|llm|ocr)$")
    use_llm_moderator: bool = True


class AnalysisResponse(BaseModel):
    """Response de l'analyse complète"""
    document_id: str
    status: str  # "processing" | "completed" | "error"
    analysis: Optional[dict] = None
    export_url: Optional[str] = None
    quality_metrics: Optional[dict] = None
    error: Optional[str] = None
    progress_url: str = ""  # WebSocket URL


class FeedbackRequest(BaseModel):
    """Feedback utilisateur sur qualité d'analyse"""
    axis: str  # "solidite", "liquidite", etc
    accuracy_score: float = Field(0.5, ge=0.0, le=1.0)
    comment: Optional[str] = None


# ════════════════════════════════════════════════════════════════════
#  POST /analyses/upload — Upload + Pipeline
# ════════════════════════════════════════════════════════════════════

@router.post("/upload", response_model=AnalysisResponse, status_code=202)
async def upload_and_analyze(
    file: UploadFile = File(...),
    company_name: Optional[str] = Form(None),
    company_sector: Optional[str] = Form(None),
    extraction_method: str = Form("auto"),
    use_llm: bool = Form(True),
    token: dict = Depends(verify_token),
) -> AnalysisResponse:
    """
    Endpoint pour upload + lancement du pipeline complet

    Retourne:
    - document_id: Identifiant unique du traitement
    - status: "processing" (202 = Accepted, pas d'attente blocking)
    - progress_url: WebSocket pour suivre la progression

    Le client se connecte au WebSocket pour recevoir les updates en temps réel
    """

    # Validation basique
    if not file.filename:
        raise HTTPException(400, "Filename required")

    user_id = token.get("uid", "anonymous")
    document_id = f"doc_{int(datetime.now().timestamp())}_{user_id[:8]}"

    # Lire le fichier
    try:
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(400, "Empty file")
        if len(file_bytes) > 50 * 1024 * 1024:  # 50 MB
            raise HTTPException(413, "File too large (max 50 MB)")
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"File read error: {e}")
        raise HTTPException(500, f"Failed to read file: {str(e)}")

    # Préparer les infos entreprise
    company_info = {
        "name": company_name,
        "sector": company_sector or "Unknown",
        "country": "Cameroon",
    }

    # Lancer le pipeline ASYNCHRONE (pas d'attente)
    try:
        # Trigger pipeline en background
        import asyncio
        asyncio.create_task(
            orchestrator.process_full_pipeline(
                document_id=document_id,
                file_bytes=file_bytes,
                filename=file.filename,
                user_id=user_id,
                company_info=company_info,
                extraction_method=extraction_method,
                use_llm_moderator=use_llm,
            )
        )

        log.info(
            f"Pipeline started: document_id={document_id}, "
            f"user={user_id}, file={file.filename}"
        )

        return AnalysisResponse(
            document_id=document_id,
            status="processing",
            progress_url=f"/analyses/v5/ws/analysis/{document_id}",
        )

    except Exception as e:
        log.error(f"Pipeline launch error: {e}")
        raise HTTPException(500, f"Failed to start pipeline: {str(e)}")


# ════════════════════════════════════════════════════════════════════
#  GET /analyses/{id} — Récupérer l'analyse
# ════════════════════════════════════════════════════════════════════

@router.get("/{document_id}", response_model=AnalysisResponse)
async def get_analysis(
    document_id: str,
    token: dict = Depends(verify_token),
) -> AnalysisResponse:
    """Récupérer l'analyse complète d'un document"""

    try:
        analysis_data = await firebase_service.get_analysis(document_id)

        if not analysis_data:
            raise HTTPException(404, f"Analysis not found: {document_id}")

        user_id = token.get("uid")
        # Vérifier permissions (user peut voir sa propre analyse)
        if analysis_data.get("user_id") != user_id:
            log.warning(f"Unauthorized access attempt: {user_id} → {document_id}")
            raise HTTPException(403, "Access denied")

        return AnalysisResponse(
            document_id=document_id,
            status="completed",
            analysis=analysis_data.get("analysis"),
            export_url=analysis_data.get("export_url"),
            quality_metrics=analysis_data.get("quality_metrics"),
        )

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Get analysis error: {e}")
        raise HTTPException(500, f"Failed to retrieve analysis: {str(e)}")


# ════════════════════════════════════════════════════════════════════
#  POST /analyses/{id}/feedback — Feedback utilisateur
# ════════════════════════════════════════════════════════════════════

@router.post("/analyses/{document_id}/feedback", status_code=200)
async def submit_analysis_feedback(
    document_id: str,
    feedback: FeedbackRequest,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Soumettre du feedback sur la qualité d'analyse
    Utilisé pour améliorer le modèle auto-calibration (semaine 2+)
    """

    user_id = token.get("uid", "anonymous")

    feedback_entry = {
        "document_id": document_id,
        "user_id": user_id,
        "axis": feedback.axis,
        "accuracy_score": feedback.accuracy_score,
        "comment": feedback.comment,
        "timestamp": datetime.now().isoformat(),
    }

    try:
        await firebase_service.store_feedback(feedback_entry)

        log.info(
            f"Feedback recorded: doc={document_id}, "
            f"axis={feedback.axis}, score={feedback.accuracy_score}"
        )

        return {
            "success": True,
            "message": "Feedback recorded successfully",
            "feedback_id": f"fb_{document_id}_{user_id}",
        }

    except Exception as e:
        log.error(f"Feedback storage error: {e}")
        raise HTTPException(500, f"Failed to store feedback: {str(e)}")


# ════════════════════════════════════════════════════════════════════
#  WS /ws/analysis/{id} — WebSocket Progression
# ════════════════════════════════════════════════════════════════════

@router.websocket("/ws/analysis/{document_id}")
async def websocket_analysis_progress(
    websocket: WebSocket,
    document_id: str,
):
    """
    WebSocket pour recevoir les updates de progression en temps réel

    Client se connecte et reçoit des messages JSON:
    {
        "stage": "ocr_extraction",
        "progress_percent": 35,
        "message": "Extraction du texte et tableaux...",
        "estimated_remaining_seconds": 25,
        "subtask": "Détection de 12 tableaux",
        "metrics": {...}
    }

    À la fin:
    {
        "stage": "completed",
        "progress_percent": 100,
        "message": "Analyse complétée avec succès"
    }
    """

    await websocket.accept()

    try:
        redis = None
        pubsub = None
        try:
            redis = aioredis.from_url("redis://localhost:6379", decode_responses=True)
            pubsub = redis.pubsub()
            await pubsub.subscribe(f"analysis:progress:{document_id}")
            log.info(f"Redis subscription established for {document_id}")
        except Exception as e:
            log.warning(f"Redis connection failed, running in polling mode: {e}")
            redis = None
            pubsub = None

        # Envoyer un ping initial
        await websocket.send_json({
            "type": "connected",
            "document_id": document_id,
            "message": "Connected to progress stream" + (" (polling mode)" if not pubsub else ""),
        })

        # Boucle de réception
        if pubsub:
            async for message in pubsub.listen():
                if message is None or message.get("type") != "message":
                    continue

                try:
                    message_data = message.get("data", "")
                    progress_data = json.loads(message_data)
                    await websocket.send_json(progress_data)

                    # Fermer si complété
                    if progress_data.get("stage") in ["completed", "error"]:
                        await websocket.send_json({
                            "type": "stream_closed",
                            "message": "Analysis processing finished"
                        })
                        break

                except json.JSONDecodeError:
                    log.warning(f"Invalid JSON in progress message: {message}")
                except Exception as e:
                    log.error(f"WebSocket send error: {e}")
                    break
        else:
            # Fallback: Redis unavailable, progress stream cannot be updated in real time.
            await websocket.send_json({
                "type": "warning",
                "stage": "progress_unavailable",
                "progress_percent": 0,
                "message": "Redis indisponible : la progression n'est pas disponible en temps réel. Le traitement continue en arrière-plan."
            })

        if pubsub:
            await pubsub.close()
        if redis:
            await redis.close()

    except Exception as e:
        log.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"Connection error: {str(e)}"
            })
        except:
            pass
    finally:
        await websocket.close()


# ════════════════════════════════════════════════════════════════════
#  Health Check
# ════════════════════════════════════════════════════════════════════

@router.get("/health")
async def health_check() -> dict[str, Any]:
    """Vérifier l'état du service"""
    return {
        "status": "healthy",
        "orchestrator": "active",
        "timestamp": datetime.now().isoformat(),
    }
