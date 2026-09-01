from datetime import datetime
from pydantic import BaseModel, Field
class ActionCreate(BaseModel): type: str; title: str; description: str | None = None; person_id: str | None = None; scheduled_at: datetime | None = None; payload: dict = Field(default_factory=dict)
class CallCreate(BaseModel): person_id: str | None = None; job_id: str | None = None; provider: str = "manual"; scheduled_at: datetime | None = None
class MessageCreate(BaseModel): person_id: str; job_id: str | None = None; content: str; channel: str = "sms"
class PaymentCreate(BaseModel): amount: float; person_id: str | None = None; job_id: str | None = None; currency: str = "INR"; description: str | None = None; due_at: datetime | None = None
class ProcessRequest(BaseModel): call_id: str | None = None; conversation_id: str | None = None; transcript: str | None = None
