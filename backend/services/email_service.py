import os
import smtplib
from email.message import EmailMessage
import logging

logger = logging.getLogger(__name__)

def send_smtp_email(to_email: str, subject: str, body: str, from_email: str | None = None) -> dict:
    """
    Sends an email using standard SMTP.
    Configured via environment variables:
      SMTP_HOST: SMTP server hostname (required for live delivery)
      SMTP_PORT: SMTP server port (default 587)
      SMTP_USER: SMTP username
      SMTP_PASSWORD: SMTP password
      SMTP_FROM: Default sender address
      SMTP_USE_TLS: Whether to use STARTTLS (default true)
      SMTP_USE_SSL: Whether to use SSL directly (default false)
    """
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM") or smtp_user or from_email or "noreply@ergon.app"
    smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")
    smtp_use_ssl = os.getenv("SMTP_USE_SSL", "false").lower() in ("true", "1", "yes")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = smtp_from
    msg["To"] = to_email
    msg.set_content(body)

    if not smtp_host:
        # If no SMTP_HOST is explicitly configured, raise a clear configuration error
        raise ValueError("SMTP_HOST is not configured in backend environment. Please set SMTP_HOST in .env to send emails.")

    if smtp_use_ssl:
        with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as server:
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
            server.send_message(msg)
    else:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            if smtp_use_tls:
                server.starttls()
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
            server.send_message(msg)

    return {
        "status": "sent",
        "to": to_email,
        "from": smtp_from,
        "subject": subject
    }
