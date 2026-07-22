
import os
import sys

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from dotenv import load_dotenv
import requests

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

print("=== Test ElevenLabs Voices API ===")
print(f"Key starts with: {ELEVENLABS_API_KEY[:10]}...")

url = "https://api.elevenlabs.io/v1/voices"
headers = {
    "xi-api-key": ELEVENLABS_API_KEY,
    "Content-Type": "application/json"
}

try:
    resp = requests.get(url, headers=headers, timeout=10)
    print(f"\nHTTP Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"✅ ElevenLabs API OK!")
        print(f"Number of voices: {len(data.get('voices', []))}")
        if data.get('voices'):
            print("First 3 voices:")
            for voice in data['voices'][:3]:
                print(f"  - {voice.get('name')} (ID: {voice.get('voice_id')})")
    else:
        print(f"❌ Error: {resp.text}")
except Exception as e:
    print(f"\n❌ Error: {type(e).__name__}: {e}")
    import traceback
    print(traceback.format_exc())
