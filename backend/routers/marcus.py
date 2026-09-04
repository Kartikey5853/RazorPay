"""Owner-facing Marcus mode built on the application's Gemini Live transport."""
import asyncio
import json
import os
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from database import get_db
from models import Job, Person, User
from routers.auth import current_user, get_current_user_ws
from schemas import CalendarEventCreate, JobCreate, PaymentCreate, PersonCreate

router = APIRouter(prefix="/marcus", tags=["marcus"])
LIVE_MODEL = "gemini-3.1-flash-live-preview"
SUMMARY_MODEL = "gemini-3.5-flash-lite"


class MarcusFinalResult(BaseModel):
    # Flat fixed fields keep this compatible with the existing Live summary pattern.
    intent: Literal["create_person", "create_job", "create_calendar_event", "create_payment", "unknown"]
    full_name: str | None = None; type: str | None = None; email: str | None = None; phone: str | None = None
    company: str | None = None; location: str | None = None; tags: list[str] = Field(default_factory=list); notes: str | None = None
    title: str | None = None; objective: str | None = None; description: str | None = None; deadline: str | None = None; budget: float | None = None
    client: str | None = None; person: str | None = None; job: str | None = None; event_type: str | None = None
    start_at: str | None = None; end_at: str | None = None; amount: float | None = None; currency: str | None = None; due_at: str | None = None


class FinalizeRequest(BaseModel):
    transcript: str = Field(min_length=1, max_length=30000)


def _client() -> genai.Client:
    key = os.getenv("GEMINI_API_KEY")
    if not key: raise RuntimeError("GEMINI_API_KEY is missing from backend/.env")
    return genai.Client(api_key=key)


def _live_prompt(user: User) -> str:
    return f"""You are Makus, Ergon's owner-facing AI assistant. The OWNER is talking directly to you. Have a natural voice conversation to prepare exactly one action. Ask one concise question at a time. Clarify ambiguity. Never say an action has been created, and never ask for final confirmation: Ergon displays a review card after the call.

Today is {datetime.now().date().isoformat()}; owner timezone is {user.timezone or 'Asia/Kolkata'}.

You MUST collect all REQUIRED fields for the chosen intent. If a REQUIRED field is missing, you MUST ask the owner for it during the current conversation. DO NOT invite the owner to end the conversation until ALL REQUIRED fields are gathered. Do not ask for OPTIONAL fields unnecessarily.
When ALL REQUIRED fields are collected, say the details are ready for review and invite the owner to end the conversation. Do not output JSON.

INTENTS:
1. CREATE PERSON
REQUIRED: full name, type (e.g., client, lead, candidate)
OPTIONAL: email, phone, company, location, tags, notes

2. CREATE JOB
REQUIRED: title, objective, description
OPTIONAL: client/person (if relevant), deadline, budget

3. CREATE CALENDAR EVENT OR REMINDER
REQUIRED: title, date, time
OPTIONAL: event type, person, job, description, end time

4. CREATE PAYMENT
REQUIRED: amount, currency, title, description, due date, person
OPTIONAL: job
(Payment always requires explicit final confirmation in the review screen.)"""


# Same browser microphone → Gemini Live → receiver loop used by the existing
# working jobs/{job_id}/call-assistant/live transport, with owner instructions.
@router.websocket("/live")
async def live_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008); return
    try: user = await get_current_user_ws(token, db)
    except Exception:
        await websocket.close(code=1008); return
    await websocket.accept()
    try:
        config = {"response_modalities": ["AUDIO"], "input_audio_transcription": {}, "output_audio_transcription": {}, "system_instruction": _live_prompt(user)}
        async with _client().aio.live.connect(model=LIVE_MODEL, config=config) as session:
            async def receive_from_owner():
                try:
                    while True:
                        message = await websocket.receive()
                        if message["type"] == "websocket.disconnect": return
                        if message.get("bytes") is not None:
                            await session.send_realtime_input(audio=types.Blob(data=message["bytes"], mime_type="audio/pcm;rate=16000"))
                        elif message.get("text") and json.loads(message["text"]).get("type") == "audio_stream_end":
                            await session.send_realtime_input(audio_stream_end=True)
                except (WebSocketDisconnect, asyncio.CancelledError): raise
                except Exception as error: await websocket.send_json({"type": "error", "message": f"Audio input error: {error}"})
            async def send_from_marcus():
                try:
                    while True:
                        async for response in session.receive():
                            content = response.server_content
                            if not content: continue
                            if content.input_transcription and content.input_transcription.text:
                                await websocket.send_json({"type": "transcript", "speaker": "user", "text": content.input_transcription.text})
                            if content.output_transcription and content.output_transcription.text:
                                await websocket.send_json({"type": "transcript", "speaker": "assistant", "text": content.output_transcription.text})
                            if content.model_turn:
                                for part in content.model_turn.parts:
                                    if part.inline_data and part.inline_data.data: await websocket.send_bytes(part.inline_data.data)
                            if content.interrupted: await websocket.send_json({"type": "interrupted"})
                            if content.turn_complete: await websocket.send_json({"type": "turn_complete"})
                except (WebSocketDisconnect, asyncio.CancelledError): raise
                except Exception as error: await websocket.send_json({"type": "error", "message": f"Marcus audio error: {error}"})
            receiver, sender = asyncio.create_task(receive_from_owner()), asyncio.create_task(send_from_marcus())
            await receiver; sender.cancel(); await asyncio.gather(sender, return_exceptions=True)
    except Exception as error:
        try: await websocket.send_json({"type": "error", "message": f"Gemini Live connection error: {error}"})
        except Exception: pass
    finally:
        try: await websocket.close()
        except Exception: pass


def _find(db: Session, model, user_id: str, reference: str | None, field):
    if not reference: return None, False
    exact = db.scalars(select(model).where(model.user_id == user_id, field.ilike(reference))).all()
    matches = exact or db.scalars(select(model).where(model.user_id == user_id, field.ilike(f"%{reference}%"))).all()
    return (matches[0], False) if len(matches) == 1 else (None, len(matches) > 1)


def _find_person(db: Session, user_id: str, reference: str | None):
    if not reference: return None, False
    exact = db.scalars(select(Person).where(Person.user_id == user_id, or_(Person.name.ilike(reference), Person.company.ilike(reference)))).all()
    matches = exact or db.scalars(select(Person).where(Person.user_id == user_id, or_(Person.name.ilike(f"%{reference}%"), Person.company.ilike(f"%{reference}%")))).all()
    return (matches[0], False) if len(matches) == 1 else (None, len(matches) > 1)


def _add(items: list[str], value: str):
    if value not in items: items.append(value)


def _review(result: MarcusFinalResult, db: Session, user: User) -> dict:
    p, params = result.model_dump(), {}
    if result.intent == "create_person":
        params = {key: p[key] for key in ("email", "phone", "company", "location", "tags", "notes") if p[key] is not None}
        params.update({"name": p.get("full_name") or "", "type": (p.get("type") or "").lower()})
    elif result.intent == "create_job":
        params = {"title": p.get("title") or "", "description": p.get("description") or "", "objective": p.get("objective") or "", "status": "draft", "requirements": {}, "constraints": {}}
        if p.get("budget") is not None: params["budget"] = p["budget"]
        if p.get("deadline"): params["deadline"] = p["deadline"]
        ref = p.get("client") or p.get("person")
        params["person_ids"] = []
        if ref:
            person, ambiguous = _find_person(db, user.id, ref)
            if person: params.update({"person_ids": [person.id], "client_name": person.name})
    elif result.intent == "create_calendar_event":
        params = {"title": p.get("title") or "", "event_type": p.get("event_type") or "Reminder", "description": p.get("description") or "", "start_at": p.get("start_at") or "", "end_at": p.get("end_at") or "", "status": "scheduled", "person_id": "", "job_id": ""}
        for kind, ref in (("person", p.get("person")), ("job", p.get("job"))):
            if ref:
                item, ambiguous = _find_person(db, user.id, ref) if kind == "person" else _find(db, Job, user.id, ref, Job.title)
                if item: params.update({f"{kind}_id": item.id, f"{kind}_name": item.name if kind == "person" else item.title})
    elif result.intent == "create_payment":
        params = {"title": p.get("title") or "", "amount": p.get("amount") or 0, "currency": p.get("currency") or "INR", "description": p.get("description") or "", "due_at": p.get("due_at") or "", "status": "pending", "person_id": "", "job_id": ""}
        ref = p.get("client") or p.get("person")
        if ref:
            person, ambiguous = _find_person(db, user.id, ref)
            if person: params.update({"person_id": person.id, "person_name": person.name})
        if p.get("job"):
            job, ambiguous = _find(db, Job, user.id, p["job"], Job.title)
            if job: params.update({"job_id": job.id, "job_title": job.title})
    return {"intent": result.intent, "parameters": params, "missing_fields": [], "ready_for_review": True}


@router.post("/finalize")
def finalize(data: FinalizeRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    prompt = f"""Extract one Ergon owner action from this completed Makus conversation. Use only facts supplied by OWNER; do not invent. Return unknown if no supported action is clear. Person: full_name,type,email,phone,company,location,tags,notes. Job: title,objective,description,deadline,budget,client/person. Calendar: title,event_type,start_at,end_at,description,person/job. Payment: title,amount,currency,description,due_at,client/person/job. Dates must be ISO 8601 only if sufficiently specified. Leave unavailable optional fields null and tags empty. Do not include IDs or keys outside the fixed schema.

TODAY IS {datetime.now().date().isoformat()}; owner timezone is {user.timezone or 'Asia/Kolkata'}. Resolve natural language dates (e.g. "tomorrow at 4 PM") relative to this.

TRANSCRIPT:
{data.transcript}"""
    try:
        client = _client()
        response = client.models.generate_content(model=SUMMARY_MODEL, contents=prompt, config={"response_mime_type": "application/json", "response_schema": MarcusFinalResult, "automatic_function_calling": {"disable": True}})
        if response.parsed is None: raise RuntimeError("Gemini did not return a final result.")
        result = response.parsed if isinstance(response.parsed, MarcusFinalResult) else MarcusFinalResult.model_validate(response.parsed)
        return _review(result, db, user)
    except RuntimeError as error: raise HTTPException(503, str(error)) from error
    except Exception as error: raise HTTPException(502, f"Makus could not finalise this conversation: {error}") from error
