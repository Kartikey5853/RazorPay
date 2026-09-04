from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CalendarEventBase(BaseModel):
    title: str
    event_type: str
    description: Optional[str] = None
    start_at: datetime
    end_at: Optional[datetime] = None
    status: Optional[str] = "scheduled"
    person_id: Optional[str] = None
    job_id: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = "INR"

class CalendarEventCreate(CalendarEventBase):
    pass

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    event_type: Optional[str] = None
    description: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    status: Optional[str] = None
    person_id: Optional[str] = None
    job_id: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
