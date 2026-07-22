
import requests

API_BASE = "http://127.0.0.1:8001"
print(f"=== Test Backend ({API_BASE}) ===")
try:
    response = requests.get(f"{API_BASE}/", timeout=5)
    print(f"Status Code: {response.status_code}")
    data = response.json()
    print("Response:")
    for key, value in data.items():
        print(f"  {key}: {value}")
    print()
    print("Backend OK !")
except Exception as e:
    print(f"Erreur: {type(e).__name__} : {e}")
