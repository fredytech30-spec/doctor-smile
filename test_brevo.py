
import os
import sys
from dotenv import load_dotenv

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()

print("=== Test Brevo API ===")
try:
    import sib_api_v3_sdk
    from sib_api_v3_sdk.rest import ApiException

    BREVO_API_KEY = os.getenv("BREVO_API_KEY")
    print(f"Using Brevo API key: {BREVO_API_KEY[:20]}...")
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = BREVO_API_KEY
    api_instance = sib_api_v3_sdk.AccountApi(sib_api_v3_sdk.ApiClient(configuration))
    account_info = api_instance.get_account()
    print("Brevo API OK!")
    print(f"Account email: {account_info.email}")
    print(f"Plan: {account_info.plan}")
    print(f"Credits: {account_info.credits}")
except Exception as e:
    print(f"Brevo API Error: {type(e).__name__}: {str(e)}")
    if hasattr(e, 'body'):
        print(f"Response body: {e.body}")
    import traceback
    print(f"Full traceback: {traceback.format_exc()}")
print()
