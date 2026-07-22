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

    if body.analyseId == "demo":
        # Injecter le contexte de la Société SPORDEMO (Image 2) — format SYSCOHADA Engine v3
        analyse_context = {
            "entreprise":        "Société SPORDEMO",
            "score":             45,
            "zone":              "vigilance",
            "ivf":               55,  # Indice de Vulnérabilité Financière
            "probabiliteDefaut": 55.0,
            "confidence":        95,
            "model":             "Moteur Déterministe SYSCOHADA v3",
            "engine":            "SYSCOHADA Engine v3.0",
            "pays":              "Cameroun / CEMAC",
            "secteur":           "Services",
            "ratios": [
                {"name": "Liquidité générale",       "value": 1.42,  "unit": "",  "benchmark": "> 1.0",   "status": "green",  "score": 71},
                {"name": "Marge nette (%)",           "value": 4.76,  "unit": "%", "benchmark": "> 2.0%",  "status": "green",  "score": 75},
                {"name": "ROE (%)",                   "value": 14.98, "unit": "%", "benchmark": "> 5.0%",  "status": "green",  "score": 80},
                {"name": "Ratio d'endettement",      "value": 2.65,  "unit": "",  "benchmark": "< 2.5",   "status": "yellow", "score": 58},
                {"name": "Rotation des actifs",       "value": 0.86,  "unit": "",  "benchmark": "> 0.5",   "status": "green",  "score": 78},
                {"name": "Délai client (DSO) — jours","value": 212,   "unit": "j", "benchmark": "< 60j",   "status": "red",    "score": 25, "compte": "411"},
                {"name": "Délai fournisseur (DPO)",   "value": 87,    "unit": "j", "benchmark": "> 60j",   "status": "green",  "score": 80, "compte": "401"},
                {"name": "Ratio Clients/Fournisseurs","value": 5.66,  "unit": "×", "benchmark": "< 1.5×",  "status": "red",    "score": 20, "compte": "411/401"},
            ],
            "risk_factors": [
                {
                    "rule":        "dso_catastrophique",
                    "name":        "DSO Catastrophique — Asphyxie Trésorerie",
                    "description": "DSO = 212 jours. Vos clients paient en moyenne après 7 mois. Chaque prestation livrée aujourd'hui ne sera encaissée qu'en mars prochain. L'entreprise se finance elle-même sur le dos de ses propres ressources.",
                    "severity":    "critical",
                    "score_impact": -30,
                    "compte":      "411",
                    "action":      "Implémentez un acompte de 50% à la signature + Mobile Money pour solde à la livraison. Relancez via WhatsApp Business tous les clients dépassant 30 jours d'impayé.",
                },
                {
                    "rule":        "ratio_cli_four_critique",
                    "name":        "Déséquilibre Clients/Fournisseurs Extrême",
                    "description": "Ratio 5,66× : pour chaque 1 FCFA dû aux fournisseurs, vos clients vous doivent 5,66 FCFA. Vous subventionnez vos clients avec l'argent que vous devez à vos fournisseurs.",
                    "severity":    "critical",
                    "score_impact": -20,
                    "compte":      "411 / 401",
                    "action":      "Stop livraison aux clients dépassant 45 jours d'impayé. Négociez des délais fournisseurs à 90 jours pour rééquilibrer le BFR.",
                },
                {
                    "rule":        "endettement_eleve",
                    "name":        "Ratio d'Endettement Au-Dessus du Seuil",
                    "description": "Endettement à 2,65× (seuil CEMAC = 2,5×). Marge de manœuvre réduite pour un nouveau crédit bancaire. Les banques BICEC/Afriland verront ce ratio comme un signal d'alerte.",
                    "severity":    "high",
                    "score_impact": -10,
                    "compte":      "16 / 17",
                    "action":      "Priorisez le remboursement des dettes court terme (compte 164) avant de solliciter un nouveau financement. Ciblez d'abord l'encaissement des créances 411 pour autofinancer le remboursement.",
                },
            ],
            "recommendations": [
                {
                    "urgency":      "immediate",
                    "level":        "high",
                    "icon":         "fa-exclamation-triangle",
                    "emoji":        "🔴",
                    "title":        "Campagne Recouvrement Urgente — Compte 411",
                    "detail":       "Contactez immédiatement tous les clients avec créances > 30 jours. Offrez 5% de remise pour paiement Mobile Money (MTN/Orange) dans les 48h.",
                    "description":  "DSO = 212 jours : vous financez vos clients avec vos propres ressources depuis 7 mois. Chaque jour d'inaction coûte de la trésorerie.",
                    "compte":       "411",
                    "impact_score": 30,
                },
                {
                    "urgency":      "immediate",
                    "level":        "high",
                    "icon":         "fa-ban",
                    "emoji":        "🔴",
                    "title":        "Stop-and-Go — Bloquer les nouvelles livraisons impayées",
                    "detail":       "Aucune livraison ou nouvelle prestation sans acompte de 50% ou solde intégral des créances en cours.",
                    "description":  "Ratio Clients/Fournisseurs à 5,66× : vous subventionnez vos clients avec l'argent dû à vos fournisseurs.",
                    "compte":       "411 / 401",
                    "impact_score": 20,
                },
                {
                    "urgency":      "court_terme",
                    "level":        "medium",
                    "icon":         "fa-file-invoice",
                    "emoji":        "🟠",
                    "title":        "Optimiser la TVA sur encaissements",
                    "detail":       "Passez d'une TVA sur débits à une TVA sur encaissements : ne payez la DGI que lorsque vos clients ont effectivement payé.",
                    "description":  "Cela libère immédiatement de la trésorerie en différant les décaissements fiscaux.",
                    "compte":       "441 / 444 / 445",
                    "impact_score": 10,
                },
            ],
            "scoreHistory": [40, 42, 41, 44, 43, 44, 45],
        }
    elif body.analyseId and body.analyseId not in ("null", "undefined", ""):
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
