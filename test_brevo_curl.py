
import requests
import os
from dotenv import load_dotenv

load_dotenv()

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
url = "https://api.brevo.com/v3/account"

headers = {
    "accept": "application/json",
    "api-key": BREVO_API_KEY
}

print("Testing Brevo API with direct request...")
print(f"API key starts with: {BREVO_API_KEY[:20]}...")
try:
    response = requests.get(url, headers=headers)
    print(f"Status code: {response.status_code}")
    print(f"Response headers: {dict(response.headers)}")
    print(f"Response body: {response.text}")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
