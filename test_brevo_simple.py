
import os
import sys

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from dotenv import load_dotenv
import requests

load_dotenv()

BREVO_API_KEY = os.getenv("BREVO_API_KEY")

print("=== Test Brevo Direct ===")
print(f"Key length: {len(BREVO_API_KEY)}")
print(f"Key starts with: {BREVO_API_KEY[:10]}...")

url = "https://api.brevo.com/v3/account"
headers = {"api-key": BREVO_API_KEY, "accept": "application/json"}

try:
    resp = requests.get(url, headers=headers, timeout=10)
    print(f"HTTP Status: {resp.status_code}")
    print(f"Response: {resp.text}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    print(traceback.format_exc())
