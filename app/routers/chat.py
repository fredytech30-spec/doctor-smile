"""
ROUTER — chat.py
DOCTOR SMILE
POST /chat → Multi-LLM + TTS + contexte analyse financiere

Contrat dashboard.js (L830-851) :
  sendChat() → payload { message, analyseId, history[], userId }
             → reponse { message, content }
  L844 : const reply = res.message ?? res.content
  L848 : addMessage(firestoreConvId, { role: user/assistant })
"""

from __future__ import annotations
import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel
from app.middleware.firebase_verify import verify_token
from app.services.chat_service import chat_service
from app.services.firebase_service import firebase_service

log = logging.getLogger("doctorsmile.router.chat")
router = APIRouter(prefix="/chat", tags=["Chat IA"])


# ── Schemas ──────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    analyseId: str | None = None
    history: list[dict[str, str]] = []
    userId: str | None = None
    mode: str | None = None
    llmProvider: str | None = None
    voiceProvider: str | None = None
    voiceId: str | None = None
    system: str | None = None

class ChatResponse(BaseModel):
    message: str
    content: str
    model: str | None = None
    voiceBytes: str | None = None  # base64 encoded audio


# ════════ POST /chat ══════════════════════════════════════════════

@router.post("", response_model=ChatResponse, status_code=200,
    summary="Chat IA contextualisé Multi-LLM avec TTS")
async def chat_endpoint(
    body: ChatRequest,
    request: Request,
    token: dict = Depends(verify_token),
) -> ChatResponse:
    """
    Flux complet :
    1. Validation du message
    2. Chargement analyse Firestore (si analyseId fourni)
    3. Vérification propriété (uid token == analyse.userId)
    4. Appel Multi-LLM (Groq → OpenAI → Anthropic → Gemini → fallback local)
    5. Génération TTS si voiceProvider est spécifié
    6. Persistence Firestore (non bloquant)
    """
    if not body.message or not body.message.strip():
        raise HTTPException(422, "Le champ message est vide.")

    log.info("[POST /chat] user=%s analyseId=%s", token.get("uid"), body.analyseId)

    # Charger le contexte de l’analyse
    analyse_context: dict[str, Any] = {}
    conv_id = body.analyseId

    if body.analyseId and body.analyseId not in ("demo", "null", "undefined", ""):
        analyse = firebase_service.get_analysis(body.analyseId)
        if analyse:
            analyse_context = analyse
            uid = token.get("uid", "")
            if not uid:
                raise HTTPException(401, "Utilisateur non authentifié.")
            owner = analyse.get("userId", "")
            if owner and owner != uid:
                raise HTTPException(403, "Accès refusé à cette analyse.")
        else:
            log.warning("[POST /chat] Analyse %s introuvable — contexte vide", body.analyseId)

    # Appel LLM
    try:
        # Récupérer les infos utilisateur
        user_info = {}
        if token.get("uid"):
            user_info = {
                "uid": token.get("uid"),
                "email": token.get("email"),
                "name": token.get("name")
            }
            if not user_info["email"]:
                profile = firebase_service.get_user_profile(token.get("uid"))
                if profile:
                    user_info["email"] = profile.get("email")
                    user_info["name"] = f"{profile.get('prenom','')} {profile.get('nom','')}".strip()

        result = await chat_service.chat(
            message=body.message.strip(),
            history=body.history[-8:],
            context=analyse_context,
            mode=body.mode or "auto",
            llm_provider=body.llmProvider,
            voice_provider=body.voiceProvider,
            voice_id=body.voiceId,
            system_prompt=body.system,
            user_info=user_info,
        )
    except Exception as exc:
        log.error("[POST /chat] chat_service error: %s", exc, exc_info=True)
        raise HTTPException(500, f"Erreur génération réponse : {exc}")

    # Persistence Firestore (non bloquant)
    if conv_id:
        firebase_service.save_conversation_message(conv_id, "user", body.message.strip())
        firebase_service.save_conversation_message(conv_id, "assistant", result["response"])

    log.info("[POST /chat] %d chars générés (model: %s)", len(result["response"]), result.get("model", "local"))

    # Prepare response
    voice_bytes_b64 = None
    if result.get("voice_bytes"):
        import base64
        voice_bytes_b64 = base64.b64encode(result["voice_bytes"]).decode("utf-8")

    return ChatResponse(
        message=result["response"],
        content=result["response"],
        model=result.get("model"),
        voiceBytes=voice_bytes_b64
    )


# ════════ GET /chat/voices ══════════════════════════════════════════

@router.get("/voices", summary="List available voices for TTS")
async def list_voices(
    provider: str = "openai",
    token: dict = Depends(verify_token),
):
    """List available voices from the specified provider (openai or elevenlabs)"""
    try:
        voices = chat_service.get_available_voices(provider)
        return {"provider": provider, "voices": voices}
    except Exception as exc:
        log.error("[GET /chat/voices] error: %s", exc)
        raise HTTPException(500, f"Erreur listing voices: {exc}")


# ════════ GET /chat/llms ════════════════════════════════════════════

@router.get("/llms", summary="List available LLM providers")
async def list_llms(
    token: dict = Depends(verify_token),
):
    """List available LLM providers (groq, openai, anthropic, gemini) that have API keys configured"""
    try:
        llms = chat_service.get_available_llms()
        return {"llms": llms}
    except Exception as exc:
        log.error("[GET /chat/llms] error: %s", exc)
        raise HTTPException(500, f"Erreur listing LLMs: {exc}")


# ════════ POST /chat/tts ════════════════════════════════════════════

@router.post("/tts", summary="Generate TTS audio from text")
async def generate_tts(
    text: str,
    provider: str = "openai",
    voiceId: str = "nova",
    token: dict = Depends(verify_token),
):
    """Generate TTS audio from text"""
    if not text or not text.strip():
        raise HTTPException(422, "Le champ text est vide.")
    try:
        audio_bytes = await chat_service.tts.generate_voice(text, provider, voiceId)
        if not audio_bytes:
            raise HTTPException(500, "Erreur génération audio.")
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"Content-Disposition": f"attachment; filename=tts_{provider}_{voiceId}.mp3"}
        )
    except Exception as exc:
        log.error("[POST /chat/tts] error: %s", exc)
        raise HTTPException(500, f"Erreur génération TTS: {exc}")
