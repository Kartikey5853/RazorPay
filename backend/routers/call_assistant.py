from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import Job, User
from routers.auth import current_user
from services.call_assistant_config import generate_config, next_question
from utils import activity, owned

router = APIRouter(prefix="/jobs", tags=["call-assistant"])

class ChatMessage(BaseModel):
    role: str
    text: str = Field(min_length=1)

class ConfigChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)

def _safe_messages(messages: list[ChatMessage]) -> list[dict[str, str]]:
    if any(message.role not in {"user", "assistant"} for message in messages):
        raise HTTPException(422, "Message role must be user or assistant")
    return [message.model_dump() for message in messages]

@router.post("/{job_id}/call-assistant/chat")
def chat(job_id: str, data: ConfigChatRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    owned(db, Job, job_id, user.id)
    try:
        return {"text": next_question(_safe_messages(data.messages))}
    except RuntimeError as error:
        raise HTTPException(503, str(error)) from error

@router.post("/{job_id}/call-assistant/generate")
def generate(job_id: str, data: ConfigChatRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    job = owned(db, Job, job_id, user.id)
    try:
        config = generate_config(_safe_messages(data.messages))
    except RuntimeError as error:
        raise HTTPException(503, str(error)) from error
    job.ai_plan = {**(job.ai_plan or {}), "call_assistant_config": config}
    activity(db, user.id, "CALL_ASSISTANT_CONFIGURED", "Call assistant configuration generated", job_id=job.id)
    db.commit()
    return config
