
import os
import sys

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from dotenv import load_dotenv
import requests

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_MODEL_ID = os.getenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")
# Use a default voice ID (pNInz6obpgDQGcFmaJgB is a popular one)
VOICE_ID = "pNInz6obpgDQGcFmaJgB"

print("=== Test ElevenLabs TTS API ===")
print(f"Key starts with: {ELEVENLABS_API_KEY[:10]}...")
print(f"Model: {ELEVENLABS_MODEL_ID}")
print(f"Voice ID: {VOICE_ID}")

url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
headers = {
    "xi-api-key": ELEVENLABS_API_KEY,
    "Content-Type": "application/json"
}
data = {
    "text": "Bonjour, ceci est un test de synthèse vocale.",
    "model_id": ELEVENLABS_MODEL_ID
}

try:
    resp = requests.post(url, headers=headers, json=data, timeout=30)
    print(f"\nHTTP Status: {resp.status_code}")
    if resp.status_code == 200:
        print(f"✅ ElevenLabs TTS API OK!")
        print(f"Audio content length: {len(resp.content)} bytes")
        # Optionally save to a file to verify
        with open("test_tts.mp3", "wb") as f:
            f.write(resp.content)
        print("Audio saved to test_tts.mp3")
    else:
        print(f"❌ Error: {resp.text}")
except Exception as e:
    print(f"\n❌ Error: {type(e).__name__}: {e}")
    import traceback
    print(traceback.format_exc())
