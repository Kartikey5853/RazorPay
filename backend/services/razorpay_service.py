import os
import razorpay
import hmac
import hashlib
import time
from dotenv import load_dotenv
load_dotenv()

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")

client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

def is_configured():
    return bool(client)

def create_payment_link(amount: float, currency: str, reference_id: str, description: str, customer: dict, expire_by: int = None):
    if not is_configured():
        raise Exception("Razorpay credentials not configured.")
        
    # Amount in smallest unit (paise for INR)
    amount_in_paise = int(round(amount * 100))
    
    # expire_by must be at least 15 mins from now.
    # We will enforce this here if it is provided.
    now = int(time.time())
    if expire_by is not None:
        if expire_by < now + 900:
            expire_by = now + 901
    
    payload = {
        "amount": amount_in_paise,
        "currency": currency,
        "accept_partial": False,
        "reference_id": reference_id,
        "description": description or "Payment Request",
        "notify": {
            "sms": bool(customer.get("contact")) if customer else False,
            "email": bool(customer.get("email")) if customer else False
        },
        "reminder_enable": True,
        "notes": {
            "reference_id": reference_id
        }
    }
    
    if customer:
        payload["customer"] = customer
    
    if expire_by:
        payload["expire_by"] = expire_by
        
    response = client.payment_link.create(payload)
    return response

def fetch_payment_link(payment_link_id: str):
    if not is_configured():
        raise Exception("Razorpay credentials not configured.")
    return client.payment_link.fetch(payment_link_id)

def cancel_payment_link(payment_link_id: str):
    if not is_configured():
        raise Exception("Razorpay credentials not configured.")
    return client.payment_link.cancel(payment_link_id)

def verify_webhook_signature(body: bytes, signature: str):
    if not RAZORPAY_WEBHOOK_SECRET:
        raise Exception("Webhook secret not configured.")
    
    expected_signature = hmac.new(
        RAZORPAY_WEBHOOK_SECRET.encode('utf-8'),
        body,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(expected_signature, signature):
        raise ValueError("Invalid webhook signature")
    return True

def create_order(amount: float, currency: str, receipt: str):
    if not is_configured():
        raise Exception("Razorpay credentials not configured.")
    amount_in_paise = int(round(amount * 100))
    if amount_in_paise < 100:
        raise ValueError("Amount must be at least 1.00 INR (100 paise)")
    
    payload = {
        "amount": amount_in_paise,
        "currency": currency,
        "receipt": receipt
    }
    return client.order.create(payload)

def verify_payment_signature(order_id: str, payment_id: str, signature: str):
    if not is_configured():
        raise Exception("Razorpay credentials not configured.")
        
    expected_signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode('utf-8'),
        (order_id + "|" + payment_id).encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(expected_signature, signature):
        raise ValueError("Invalid payment signature")
    return True
