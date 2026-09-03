"""Realtime Gemini call transport and completed-call summarisation."""
import asyncio
import json
import os
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import Job
from routers.auth import current_user, get_current_user_ws

router = APIRouter(prefix="/jobs", tags=["live-call"])
LIVE_MODEL = "gemini-3.1-flash-live-preview"
SUMMARY_MODEL = "gemini-3.5-flash-lite"


class CallQuestion(BaseModel):
    question: str
    answered: Literal["yes", "no", "partial"]
    answer: str | None = None


class PersonInfo(BaseModel):
    skills: list[str] = Field(default_factory=list)
    experience: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    availability: str | None = None
    compensation: str | None = None


class CallAction(BaseModel):
    required: bool = False
    type: str | None = None
    reason: str | None = None


class CallSummary(BaseModel):
    call_outcome: Literal["interested", "not_interested", "needs_follow_up", "qualified", "unqualified"]
    summary: list[str]
    information_collected: PersonInfo
    questions_from_contact: list[CallQuestion] = Field(default_factory=list)
    unanswered: list[str] = Field(default_factory=list)
    next_action: str | None = None
    action: CallAction


class SummaryRequest(BaseModel):
    transcript: str = Field(min_length=1)


def build_instructions(config: dict) -> str:
    return f"""You are Marcus, an AI calling assistant. Follow this owner configuration.
OBJECTIVE: {config.get('objective', '')}
TARGET PERSON: {config.get('target_person', '')}
REQUIRED INFORMATION: {json.dumps(config.get('required_information', []))}
QUALIFICATION CRITERIA: {json.dumps(config.get('qualification_criteria', []))}
CONVERSATION RULES: {json.dumps(config.get('conversation_rules', []))}
DISQUALIFICATION CONDITIONS: {json.dumps(config.get('disqualification_conditions', []))}
CALL END CONDITIONS: {json.dumps(config.get('call_end_conditions', []))}
FOLLOW-UP: {json.dumps(config.get('follow_up', []))}
Accomplish the objective naturally. Ask one concise question at a time, collect information conversationally, and never invent facts. Follow qualification, disqualification, and call-end conditions. Keep answers concise."""


@router.post("/{job_id}/call-assistant/summary", response_model=CallSummary)
def summarize_call(job_id: str, data: SummaryRequest, user=Depends(current_user), db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    prompt = f"""Analyze this completed business call. MARCUS is the business representative and CANDIDATE is the contacted person. Create an accurate business record using only facts in the transcript.
Extract candidate skills, concrete experience/projects, interests, availability, compensation, meaningful candidate questions, unanswered points, business outcome and next action. Do not confuse Marcus's statements with candidate facts or invent facts. `answered` must be yes, no, or partial. call_outcome must be interested, not_interested, needs_follow_up, qualified, or unqualified. Provide exactly 5 or 6 concise summary bullets.
TRANSCRIPT:
{data.transcript}"""
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    response = client.models.generate_content(model=SUMMARY_MODEL, contents=prompt, config={"response_mime_type": "application/json", "response_schema": CallSummary})
    if response.parsed is None:
        raise HTTPException(status_code=502, detail="Gemini did not return a call summary")
    return response.parsed


@router.websocket("/{job_id}/call-assistant/live")
async def live_call_endpoint(websocket: WebSocket, job_id: str, db: Session = Depends(get_db)):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return
    try:
        user = await get_current_user_ws(token, db)
    except Exception:
        await websocket.close(code=1008)
        return
    job = db.get(Job, job_id)
    if not job or job.user_id != user.id:
        await websocket.close(code=1008)
        return
    await websocket.accept()
    config = (job.ai_plan or {}).get("call_assistant_config", {})
    if not config:
        await websocket.send_json({"type": "error", "message": "No AI configuration found for this job"})
        await websocket.close(code=1011)
        return
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        gemini_config = {"response_modalities": ["AUDIO"], "input_audio_transcription": {}, "output_audio_transcription": {}, "system_instruction": build_instructions(config)}
        async with client.aio.live.connect(model=LIVE_MODEL, config=gemini_config) as session:
            async def receive_from_client():
                try:
                    while True:
                        message = await websocket.receive()
                        if message["type"] == "websocket.disconnect": return
                        if message.get("bytes") is not None:
                            await session.send_realtime_input(audio=types.Blob(data=message["bytes"], mime_type="audio/pcm;rate=16000"))
                        elif message.get("text"):
                            if json.loads(message["text"]).get("type") == "audio_stream_end":
                                await session.send_realtime_input(audio_stream_end=True)
                except (WebSocketDisconnect, asyncio.CancelledError): raise
                except Exception as exc: print(f"Error receiving from client: {exc}")

            async def send_to_client():
                try:
                    # `session.receive()` may finish after one Gemini turn.  Keep listening
                    # on the same live session; a normal turn completion must not end a call.
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
                except Exception as exc: print(f"Error receiving from Gemini: {exc}")

            receiver, sender = asyncio.create_task(receive_from_client()), asyncio.create_task(send_to_client())
            await receiver
            sender.cancel()
            await asyncio.gather(sender, return_exceptions=True)
    except Exception as exc:
        print(f"Gemini connection error: {exc}")
    finally:
        try: await websocket.close()
        except Exception: pass
