
"""
==========================================
TTS SERVICE — Text-to-Speech pour Doctor Smile
Intégration ElevenLabs avec voix prédéfinies magnifiques
==========================================
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional, List
from dataclasses import dataclass
from enum import Enum
from dotenv import load_dotenv

# Load .env from project root first
project_root = Path(__file__).parents[2]
env_path = project_root / '.env'
load_dotenv(dotenv_path=env_path, override=True)

# Now initialize logger
log = logging.getLogger("doctorsmile.tts")
log.info(f"Loading .env from: {env_path}")
log.info(f"ELEVENLABS_API_KEY available: {bool(os.getenv('ELEVENLABS_API_KEY'))}")


class VoiceGender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    NEUTRAL = "neutral"


class VoiceStyle(str, Enum):
    PROFESSIONAL = "professional"
    FRIENDLY = "friendly"
    CALM = "calm"
    ENERGETIC = "energetic"
    COMPASSIONATE = "compassionate"
    ACADEMIC = "academic"


@dataclass
class VoicePreset:
    voice_id: str
    name: str
    gender: VoiceGender
    style: VoiceStyle
    language: str
    description: str
    stability: float = 0.5
    similarity_boost: float = 0.8
    style_exaggeration: float = 0.5


class VoiceManager:
    """Gestionnaire de voix prédéfinies — collection de voix magnifiques"""

    BEAUTIFUL_VOICES: List[VoicePreset] = [
        VoicePreset(
            voice_id="EXAVITQu4vr4xnSDxMaL",
            name="Rachel",
            gender=VoiceGender.FEMALE,
            style=VoiceStyle.FRIENDLY,
            language="en",
            description="Voix féminine chaleureuse et amicale, parfaite pour les conversations naturelles",
            stability=0.5,
            similarity_boost=0.8,
            style_exaggeration=0.0
        ),
        VoicePreset(
            voice_id="pNInz6obpgDQGcFmaJgB",
            name="Domi",
            gender=VoiceGender.FEMALE,
            style=VoiceStyle.COMPASSIONATE,
            language="en",
            description="Voix féminine douce et compatissante, idéale pour le soutien",
            stability=0.6,
            similarity_boost=0.7,
            style_exaggeration=0.3
        ),
        VoicePreset(
            voice_id="pFZP5JQG7iQjIQuC4Bku",
            name="Bella",
            gender=VoiceGender.FEMALE,
            style=VoiceStyle.PROFESSIONAL,
            language="en",
            description="Voix féminine professionnelle et élégante pour les présentations",
            stability=0.55,
            similarity_boost=0.85,
            style_exaggeration=0.2
        ),
        VoicePreset(
            voice_id="AZnzlk1XvdvUeBnXmlld",
            name="Matilda",
            gender=VoiceGender.FEMALE,
            style=VoiceStyle.CALM,
            language="en",
            description="Voix féminine douce et apaisante",
            stability=0.65,
            similarity_boost=0.85,
            style_exaggeration=0.0
        ),
        VoicePreset(
            voice_id="nPczCjzI2devNBz1zQrb",
            name="Emily",
            gender=VoiceGender.FEMALE,
            style=VoiceStyle.ENERGETIC,
            language="en",
            description="Voix féminine énergique et dynamique",
            stability=0.45,
            similarity_boost=0.7,
            style_exaggeration=0.6
        ),
        VoicePreset(
            voice_id="21m00Tcm4TlvDq8ikWAM",
            name="Antoni",
            gender=VoiceGender.MALE,
            style=VoiceStyle.FRIENDLY,
            language="en",
            description="Voix masculine chaleureuse et accessible",
            stability=0.5,
            similarity_boost=0.75,
            style_exaggeration=0.1
        ),
        VoicePreset(
            voice_id="GBv7mTt0atIp3Br8iCZE",
            name="Thomas",
            gender=VoiceGender.MALE,
            style=VoiceStyle.PROFESSIONAL,
            language="en",
            description="Voix masculine professionnelle et autoritaire",
            stability=0.6,
            similarity_boost=0.8,
            style_exaggeration=0.4
        ),
        VoicePreset(
            voice_id="JBFqnCBsd6RMkjVDRZzb",
            name="Brian",
            gender=VoiceGender.MALE,
            style=VoiceStyle.CALM,
            language="en",
            description="Voix masculine profonde et relaxante",
            stability=0.6,
            similarity_boost=0.8,
            style_exaggeration=0.2
        ),
        VoicePreset(
            voice_id="flq6f7yk4E4fJuoOrIe6",
            name="Chris",
            gender=VoiceGender.MALE,
            style=VoiceStyle.ENERGETIC,
            language="en",
            description="Voix masculine dynamique et engageante",
            stability=0.45,
            similarity_boost=0.7,
            style_exaggeration=0.5
        ),
        VoicePreset(
            voice_id="XrExE9yKIg1WjnnlVkGX",
            name="Jessica",
            gender=VoiceGender.FEMALE,
            style=VoiceStyle.ACADEMIC,
            language="en",
            description="Voix féminine claire et instructive",
            stability=0.55,
            similarity_boost=0.8,
            style_exaggeration=0.1
        ),
    ]

    @classmethod
    def get_all_voices(cls):
        return cls.BEAUTIFUL_VOICES

    @classmethod
    def get_voice_by_id(cls, voice_id):
        for voice in cls.BEAUTIFUL_VOICES:
            if voice.voice_id == voice_id:
                return voice
        return None

    @classmethod
    def get_voices_by_gender(cls, gender):
        return [voice for voice in cls.BEAUTIFUL_VOICES if voice.gender == gender]

    @classmethod
    def get_voices_by_style(cls, style):
        return [voice for voice in cls.BEAUTIFUL_VOICES if voice.style == style]


class TTSService:
    """Service principal de synthèse vocale"""

    def __init__(self):
        self._client = None
        self._api_key = os.getenv("ELEVENLABS_API_KEY")
        self._model_id = os.getenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")
        self._default_stability = float(os.getenv("ELEVENLABS_STABILITY", "0.5"))
        self._default_similarity_boost = float(os.getenv("ELEVENLABS_SIMILARITY_BOOST", "0.8"))
        self._default_style = float(os.getenv("ELEVENLABS_STYLE", "0.5"))
        self._use_speaker_boost = os.getenv("ELEVENLABS_USE_SPEAKER_BOOST", "true").lower() == "true"

        self._init_client()

    def _init_client(self):
        if not self._api_key:
            log.warning("⚠️ ELEVENLABS_API_KEY non définie — mode Web Speech API uniquement")
            return

        try:
            from elevenlabs import ElevenLabs
            self._client = ElevenLabs(api_key=self._api_key)
            log.info("✅ ElevenLabs initialisé avec succès")
        except ImportError:
            log.warning("⚠️ Paquet elevenlabs non installé — mode Web Speech API uniquement")
        except Exception as exc:
            log.error("Erreur initialisation ElevenLabs: %s", exc)

    @property
    def available(self):
        return self._client is not None and self._api_key is not None

    def synthesize_speech(self, text, voice_id="EXAVITQu4vr4xnSDxMaL", model_id=None, stability=None, similarity_boost=None, style_exaggeration=None, output_file=None):
        if not self.available:
            log.warning("ElevenLabs non disponible")
            return None

        try:
            voice_preset = VoiceManager.get_voice_by_id(voice_id)

            final_stability = stability if stability is not None else (voice_preset.stability if voice_preset else self._default_stability)
            final_similarity = similarity_boost if similarity_boost is not None else (voice_preset.similarity_boost if voice_preset else self._default_similarity_boost)
            final_style = style_exaggeration if style_exaggeration is not None else (voice_preset.style_exaggeration if voice_preset else self._default_style)
            final_model = model_id if model_id else self._model_id

            audio_stream = self._client.text_to_speech.convert(
                text=text,
                voice_id=voice_id,
                model_id=final_model,
                voice_settings={
                    "stability": final_stability,
                    "similarity_boost": final_similarity,
                    "style": final_style,
                    "use_speaker_boost": self._use_speaker_boost
                }
            )

            audio_bytes = b"".join(audio_stream)

            if output_file:
                with open(output_file, "wb") as f:
                    f.write(audio_bytes)
                log.info("Audio sauvegardé dans: %s", output_file)

            return audio_bytes

        except Exception as exc:
            log.error("Erreur lors de la synthèse vocale: %s", exc)
            return None


tts_service = TTSService()
