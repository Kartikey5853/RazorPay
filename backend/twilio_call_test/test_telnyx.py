import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("TELNYX_API_KEY")

if not api_key:
    raise RuntimeError("TELNYX_API_KEY not found")

print("✅ Telnyx API key loaded")
print("Key starts with:", api_key[:8] + "...")