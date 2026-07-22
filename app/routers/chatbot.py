"""
ROUTER — chatbot.py v4.0
Chatbot Financier - Doctor Smile
════════════════════════════════════════════════════════════════

POST /chatbot/query → Question utilisateur → Réponse chatbot
GET  /chatbot/history → Historique des conversations

NOUVEAU v4.0 :
  - Chatbot focalisé sur diagnostic financier
  - Réponses concises et actionnables
  - Intégration LLM optionnelle
  - Fallback règles déterministes
════════════════════════════════════════════════════════════════
"""

from __future__ import annotations
import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.middleware.firebase_verify import verify_token
from app.services.chatbot_service import chatbot_service
from app.services.chat_service import _get_client, chat_service as elite_chat_service

log = logging.getLogger("doctorsmile.router.chatbot")
router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


# ── Schemas ──────────────────────────────────────────────────

class ChatbotQuery(BaseModel):
    userId: str = Field(..., min_length=5)
    query: str = Field(..., min_length=1, max_length=500)
    analysisData: dict[str, Any] | None = None

class ChatbotResponse(BaseModel):
    success: bool
    response: str
    intent: str
    confidence: float


# ════════ POST /chatbot/query ════════════════════════════════════

@router.post("/query", response_model=ChatbotResponse, status_code=200,
    summary="Question utilisateur → Réponse chatbot")
async def chatbot_query(
    body: ChatbotQuery,
    token: dict = Depends(verify_token),
) -> ChatbotResponse:
    """
    Traite une question de l'utilisateur et génère une réponse.
    Le chatbot est focalisé sur le diagnostic financier.
    """
    try:
        uid = token.get("uid", "")
        if uid and uid != "dev-uid-000" and uid != body.userId:
            raise HTTPException(403, "userId ne correspond pas au token Firebase")
        
        # Préparer un client LLM Groq si disponible
        client_data = _get_client("groq")
        llm_client = None
        if client_data:
            # Fournit un adaptateur simple attendu par chatbot_service (méthode async generate)
            async def _generate_via_elite(prompt: str) -> str:
                text, model = await elite_chat_service._chat_with_elite_llm(
                    prompt, [], {}, "auto", "groq", None
                )
                return text

            class _Adapter:
                async def generate(self, prompt: str) -> str:
                    return await _generate_via_elite(prompt)

            llm_client = _Adapter()

        # Appel au service chatbot
        log.info(f"[Chatbot] llm_client présent: {bool(llm_client)} | client_data: {client_data}")
        result = await chatbot_service.generate_response(
            user_query=body.query,
            analysis_data=body.analysisData or {},
            llm_client=llm_client
        )
        
        return ChatbotResponse(
            success=result["success"],
            response=result.get("response", "Erreur de génération de réponse"),
            intent=result.get("intent", "general"),
            confidence=result.get("confidence", 0.0)
        )
        
    except Exception as e:
        log.error(f"[Chatbot] Erreur traitement query: {e}")
        raise HTTPException(500, "Erreur lors du traitement de la question")


# ════════ GET /chatbot/history ════════════════════════════════════

@router.get("/history", status_code=200,
    summary="Historique des conversations")
async def get_chatbot_history(
    token: dict = Depends(verify_token),
    limit: int = 50
) -> dict[str, Any]:
    """
    Récupère l'historique des conversations de l'utilisateur de manière persistante depuis Firestore.
    """
    try:
        uid = token.get("uid", "")
        
        import asyncio
        from app.services.firebase_service import firebase_service
        history = await asyncio.to_thread(firebase_service.get_user_conversations, uid)
        
        return {
            "user_id": uid,
            "history": history[:limit],
            "count": len(history),
            "limit": limit
        }
        
    except Exception as e:
        log.error(f"[Chatbot] Erreur récupération historique: {e}")
        raise HTTPException(500, "Erreur lors de la récupération de l'historique")

