import os

from dotenv import load_dotenv
from twilio.rest import Client


load_dotenv()

account_sid = os.getenv("TWILIO_ACCOUNT_SID")
auth_token = os.getenv("TWILIO_AUTH_TOKEN")

twilio_number = os.getenv("TWILIO_PHONE_NUMBER")
my_number = os.getenv("MY_PHONE_NUMBER")


if not all([
    account_sid,
    auth_token,
    twilio_number,
    my_number
]):
    raise RuntimeError("Missing Twilio variables in .env")


client = Client(
    account_sid,
    auth_token
)


call = client.calls.create(
    to=my_number,
    from_=twilio_number,
    twiml="""
<Response>
    <Say>
        Hello! This is the Razorpay AI calling test.
    </Say>
</Response>
"""
)


print()
print("📞 CALL STARTED")
print()
print("Call SID:", call.sid)