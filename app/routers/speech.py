
"""
==========================================
ROUTEUR SPEECH — API pour la synthèse vocale
==========================================
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field
from typing import Optional, List
import logging

from app.services.tts_service import (
    tts_service,
    VoiceManager,
    VoiceGender,
    VoiceStyle
)

log = logging.getLogger("doctorsmile.speech")
router = APIRouter(prefix="/api/speech", tags=["speech"])


class SpeechRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Texte à synthétiser en audio")
    voice_id: Optional[str] = Field(
        default="EXAVITQu4vr4xnSDxMaL",
        description="ID de la voix à utiliser"
    )
    model_id: Optional[str] = Field(default=None, description="Modèle ElevenLabs à utiliser")
    stability: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Stabilité de la voix")
    similarity_boost: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Boost de similarité")
    style_exaggeration: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Exagération du style")


class VoiceResponse(BaseModel):
    voice_id: str
    name: str
    gender: str
    style: str
    language: str
    description: str
    stability: float
    similarity_boost: float
    style_exaggeration: float


@router.get("/status")
async def get_status():
    """Vérifie si le service TTS (ElevenLabs) est disponible"""
    return {
        "available": tts_service.available,
        "message": "ElevenLabs est prêt" if tts_service.available else "ElevenLabs non configuré (vérifiez ELEVENLABS_API_KEY dans .env)"
    }


@router.get("/voices", response_model=List[VoiceResponse])
async def get_voices(gender: Optional[VoiceGender] = None, style: Optional[VoiceStyle] = None):
    """Retourne la liste des voix prédéfinies magnifiques"""
    if gender:
        voices = VoiceManager.get_voices_by_gender(gender)
    elif style:
        voices = VoiceManager.get_voices_by_style(style)
    else:
        voices = VoiceManager.get_all_voices()

    return [
        VoiceResponse(
            voice_id=v.voice_id,
            name=v.name,
            gender=v.gender.value,
            style=v.style.value,
            language=v.language,
            description=v.description,
            stability=v.stability,
            similarity_boost=v.similarity_boost,
            style_exaggeration=v.style_exaggeration
        )
        for v in voices
    ]


@router.get("/voices/{voice_id}", response_model=VoiceResponse)
async def get_voice(voice_id: str):
    """Récupère une voix par son ID"""
    voice = VoiceManager.get_voice_by_id(voice_id)
    if not voice:
        raise HTTPException(status_code=404, detail="Voix non trouvée")

    return VoiceResponse(
        voice_id=voice.voice_id,
        name=voice.name,
        gender=voice.gender.value,
        style=voice.style.value,
        language=voice.language,
        description=voice.description,
        stability=voice.stability,
        similarity_boost=voice.similarity_boost,
        style_exaggeration=voice.style_exaggeration
    )


@router.post("/synthesize")
async def synthesize_speech(request: SpeechRequest):
    """Synthétise un texte en audio MP3 avec ElevenLabs"""
    if not tts_service.available:
        raise HTTPException(
            status_code=503,
            detail="Service TTS indisponible — vérifiez ELEVENLABS_API_KEY dans .env"
        )

    audio_bytes = tts_service.synthesize_speech(
        text=request.text,
        voice_id=request.voice_id,
        model_id=request.model_id,
        stability=request.stability,
        similarity_boost=request.similarity_boost,
        style_exaggeration=request.style_exaggeration
    )

    if not audio_bytes:
        raise HTTPException(status_code=500, detail="Échec de la synthèse vocale")

    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": 'attachment; filename="doctor-smile-speech.mp3"'
        }
    )


@router.get("/synthesize")
async def synthesize_speech_get(
    text: str = Query(..., min_length=1, description="Texte à synthétiser"),
    voice_id: Optional[str] = Query(default="EXAVITQu4vr4xnSDxMaL")
):
    """Version GET de la synthèse vocale (pour l'intégration facile dans le frontend)"""
    if not tts_service.available:
        raise HTTPException(
            status_code=503,
            detail="Service TTS indisponible"
        )

    audio_bytes = tts_service.synthesize_speech(text=text, voice_id=voice_id)
    if not audio_bytes:
        raise HTTPException(status_code=500, detail="Échec de la synthèse")

    return Response(
        content=audio_bytes,
        media_type="audio/mpeg"
    )
