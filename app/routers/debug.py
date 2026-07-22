from __future__ import annotations
import logging
from fastapi import APIRouter
from app.services.chat_service import chat_service

log = logging.getLogger("doctorsmile.router.debug")
router = APIRouter(prefix="/debug", tags=["Debug"])


@router.get("/llms")
async def available_llms():
    """Retourne la liste des LLM disponibles détectés par le backend."""
    try:
        return {"available": chat_service.get_available_llms()}
    except Exception as e:
        log.error("debug/llms error: %s", e)
        return {"error": str(e)}
