
import os
import sys
from dotenv import load_dotenv

# Configure stdout to handle Unicode
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()

print("=== Test des APIs Doctor Smile ===")
print()

# 1. Test Groq API (premier car plus critique)
print("1. Test Groq API...")
try:
    from groq import AsyncGroq
    import asyncio

    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    client = AsyncGroq(api_key=GROQ_API_KEY)

    async def test_groq():
        response = await client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": "Bonjour, test!"}],
            temperature=0.2,
            max_tokens=100
        )
        return response.choices[0].message.content

    result = asyncio.run(test_groq())
    print("   OK: Groq API fonctionne!")
    print(f"   Reponse: {result[:50]}...")
except Exception as e:
    print(f"   KO: {str(e)}")
print()

# 2. Test Brevo API
print("2. Test Brevo API...")
try:
    import sib_api_v3_sdk
    from sib_api_v3_sdk.rest import ApiException

    BREVO_API_KEY = os.getenv("BREVO_API_KEY")
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = BREVO_API_KEY
    api_instance = sib_api_v3_sdk.AccountApi(sib_api_v3_sdk.ApiClient(configuration))
    account_info = api_instance.get_account()
    print(f"   OK: Brevo API fonctionne!")
    print(f"   Compte: {account_info.email}")
except Exception as e:
    print(f"   KO: {str(e)}")
print()

# 3. Test TTS (OpenAI fallback)
print("3. Test TTS (OpenAI)...")
try:
    from openai import OpenAI

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    if OPENAI_API_KEY:
        client = OpenAI(api_key=OPENAI_API_KEY)
        # Small test: just check we can call the API (no need to generate audio)
        models = client.models.list()
        print(f"   OK: OpenAI API fonctionne (TTS disponible)!")
    else:
        print("   SKIP: OPENAI_API_KEY non configurée")
except Exception as e:
    print(f"   KO: {str(e)}")
print()

# 4. Test Firebase
print("4. Test Firebase...")
try:
    import firebase_admin
    from firebase_admin import credentials, firestore

    FIREBASE_CRED_PATH = os.getenv("FIREBASE_CRED_PATH")
    if not firebase_admin._apps:
        cred = credentials.Certificate(FIREBASE_CRED_PATH)
        firebase_admin.initialize_app(cred)
    db = firestore.client()
    # Test simple: vérifier qu'on peut accéder à une collection
    test_ref = db.collection("test").limit(1)
    test_docs = list(test_ref.stream())  # Peut être vide, c'est okay
    print("   OK: Firebase fonctionne!")
except Exception as e:
    print(f"   KO: {str(e)}")
print()

print("=== Fin des tests ===")
