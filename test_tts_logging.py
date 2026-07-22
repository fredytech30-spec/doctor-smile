
import os
import sys
import logging
from dotenv import load_dotenv
import asyncio

# Configure logging to a file
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("tts_test.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Fix Windows terminal encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

from app.services.chat_service import EliteTTSService, ELITE_VOICES

async def test_tts():
    logger.info("=== Testing TTS Service ===")
    
    tts = EliteTTSService()
    
    # Test ElevenLabs with valid voice
    logger.info("\nTesting ElevenLabs TTS with voice 'arthur'...")
    try:
        # Get a valid ElevenLabs voice ID from ELITE_VOICES
        eleven_voice_id = ELITE_VOICES["elevenlabs"]["arthur"]["id"]
        logger.info(f"Using voice ID: {eleven_voice_id}")
        
        audio_bytes = await tts.generate_voice(
            text="Bonjour, ceci est un test de la synthèse vocale ElevenLabs depuis le service Doctor Smile !",
            provider="elevenlabs",
            voice_id=eleven_voice_id
        )
        if audio_bytes:
            logger.info(f"OK: ElevenLabs TTS worked! {len(audio_bytes)} bytes")
            with open("test_tts_service.mp3", "wb") as f:
                f.write(audio_bytes)
            logger.info("Audio saved to test_tts_service.mp3")
        else:
            logger.error("ERROR: ElevenLabs TTS returned None")
    except Exception as e:
        logger.error(f"ERROR: ElevenLabs TTS error: {type(e).__name__}: {e}")
        import traceback
        logger.error(traceback.format_exc())
    
    # Test OpenAI (if configured)
    logger.info("\nTesting OpenAI TTS...")
    try:
        audio_bytes = await tts.generate_voice(
            text="Hello, this is a test of the OpenAI TTS service from Doctor Smile!",
            provider="openai"
        )
        if audio_bytes:
            logger.info(f"OK: OpenAI TTS worked! {len(audio_bytes)} bytes")
        else:
            logger.info("INFO: OpenAI TTS returned None (probably no API key)")
    except Exception as e:
        logger.error(f"ERROR: OpenAI TTS error: {type(e).__name__}: {e}")
        import traceback
        logger.error(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(test_tts())
