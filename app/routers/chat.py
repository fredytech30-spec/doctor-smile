"""
ROUTER — chat.py
DOCTOR SMILE
POST /chat → Gemini Flash + contexte analyse financiere

Contrat dashboard.js (L830-851) :
  sendChat() → payload { message, analyseId, history[], userId }
             → reponse { message, content }
  L844 : const reply = res.message ?? res.content
  L848 : addMessage(firestoreConvId, { role: user/assistant })
"""

from __future__ import annotations
import logging
import os
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from app.middleware.firebase_verify import verify_token
from app.services.chat_service     import chat_service
from app.services.firebase_service import firebase_service

log    = logging.getLogger("doctorsmile.router.chat")
router = APIRouter(prefix="/chat", tags=["Chat IA"])

# ── Mode développement (à retirer ou commenter en production) ───────
_DEV_MODE = os.getenv("ENV") == "development" or "127.0.0.1" in os.getenv("HOST", "")

# ── Schemas ──────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message:   str
    analyseId: str | None           = None
    history:   list[dict[str, str]] = []
    userId:    str | None           = None
    mode:      str | None           = None
    model:     str | None           = None
    system:    str | None           = None

class ChatResponse(BaseModel):
    message: str
    content: str


# ════════ POST /chat ══════════════════════════════════════════════

@router.post("", response_model=ChatResponse, status_code=200,
    summary="Chat IA contextualisé Gemini Flash")
async def chat_endpoint(
    body:  ChatRequest,
    request: Request,                     # ← ajouté pour détecter l’origine
    token: dict = Depends(verify_token),  # ← gardé, mais dérogé en dev
) -> ChatResponse:
    """
    Flux complet :
    1. Validation du message
    2. Chargement analyse Firestore (si analyseId fourni)
    3. Vérification propriété (uid token == analyse.userId)
    4. Appel Gemini Flash avec contexte
    5. Fallback local si erreur
    6. Persistence Firestore (non bloquant)
    """
    if not body.message or not body.message.strip():
        raise HTTPException(422, "Le champ message est vide.")

    # ── DÉROGATION MODE DEV : pas de vérification auth si local ─────
    if _DEV_MODE or "127.0.0.1" in request.client.host:
        token = {"uid": body.userId or "dev-uid-000"}
        log.info("[DEV MODE] Auth bypasséere — uid fictif utilisé")

    log.info("[POST /chat] user=%s analyseId=%s", token.get("uid"), body.analyseId)

    # Charger le contexte de l’analyse
    analyse_context: dict[str, Any] = {}
    conv_id = body.analyseId

    if body.analyseId and body.analyseId not in ("demo", "null", "undefined", ""):
        analyse = firebase_service.get_analysis(body.analyseId)
        if analyse:
            analyse_context = analyse
            uid = token.get("uid", "")
            if uid and uid != "dev-uid-000":
                owner = analyse.get("userId", "")
                if owner and owner != uid:
                    raise HTTPException(403, "Accès refusé à cette analyse.")
        else:
            log.warning("[POST /chat] Analyse %s introuvable — contexte vide", body.analyseId)

    # Appel LLM (Gemini Flash → fallback local)
    try:
        reply = await chat_service.chat(
            message=body.message.strip(),
            history=body.history[-8:],
            context=analyse_context,
            mode=body.mode or "auto",
            system=body.system,
        )
    except Exception as exc:
        log.error("[POST /chat] chat_service error: %s", exc, exc_info=True)
        raise HTTPException(500, f"Erreur génération réponse : {exc}")

    # Persistence Firestore (non bloquant)
    if conv_id:
        firebase_service.save_conversation_message(conv_id, "user",      body.message.strip())
        firebase_service.save_conversation_message(conv_id, "assistant", reply)

    log.info("[POST /chat] %d chars générés", len(reply))
    return ChatResponse(message=reply, content=reply)