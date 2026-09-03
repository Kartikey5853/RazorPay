import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from google import genai
from google.genai import types
import os

from database import get_db
from models import Job, User
from routers.auth import get_current_user_ws

router = APIRouter(prefix="/jobs", tags=["live-call"])

@router.websocket("/{job_id}/call-assistant/live")
async def live_call_endpoint(websocket: WebSocket, job_id: str, db: Session = Depends(get_db)):
    # Authenticate via query param or header, simplify for now by ignoring auth or getting it from query
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

    config = job.ai_plan.get("call_assistant_config", {}) if job.ai_plan else {}
    if not config:
        await websocket.send_json({"type": "error", "message": "No AI configuration found for this job"})
        await websocket.close(code=1011)
        return

    instructions = f"""You are an AI calling assistant.
Follow the owner's configuration below.

OBJECTIVE:
{config.get("objective", "")}

TARGET PERSON:
{config.get("target_person", "")}

REQUIRED INFORMATION:
{json.dumps(config.get("required_information", []), indent=2)}

QUALIFICATION CRITERIA:
{json.dumps(config.get("qualification_criteria", []), indent=2)}

CONVERSATION RULES:
{json.dumps(config.get("conversation_rules", []), indent=2)}

DISQUALIFICATION CONDITIONS:
{json.dumps(config.get("disqualification_conditions", []), indent=2)}

CALL END CONDITIONS:
{json.dumps(config.get("call_end_conditions", []), indent=2)}

FOLLOW-UP:
{json.dumps(config.get("follow_up", []), indent=2)}

================ BEHAVIOR ================
Your job is to accomplish the objective naturally through conversation.
Ask one question at a time.
Collect the required information naturally rather than reading a questionnaire.
If the person asks a question, answer it when the configuration contains enough information to answer it.
If the configuration does not provide an answer, do not invent one.
Keep responses concise and conversational.
"""

    gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    LIVE_MODEL = "gemini-3.1-flash-live-preview"
    
    gemini_config = {
        "response_modalities": ["AUDIO"],
        "input_audio_transcription": {},
        "output_audio_transcription": {},
        "system_instruction": instructions
    }

    try:
        async with gemini_client.aio.live.connect(model=LIVE_MODEL, config=gemini_config) as session:
            
            async def receive_from_client():
                try:
                    while True:
                        data = await websocket.receive_bytes()
                        await session.send_realtime_input(audio=types.Blob(data=data, mime_type="audio/pcm;rate=16000"))
                except WebSocketDisconnect:
                    pass
                except Exception as e:
                    print(f"Error receiving from client: {e}")

            async def send_to_client():
                try:
                    async for response in session.receive():
                        if not response.server_content:
                            continue
                        content = response.server_content
                        
                        # Send transcriptions
                        if content.input_transcription and content.input_transcription.text:
                            await websocket.send_json({"type": "transcript", "speaker": "user", "text": content.input_transcription.text})
                            
                        if content.output_transcription and content.output_transcription.text:
                            await websocket.send_json({"type": "transcript", "speaker": "assistant", "text": content.output_transcription.text})
                            
                        # Send audio
                        if content.model_turn:
                            for part in content.model_turn.parts:
                                if part.inline_data and part.inline_data.data:
                                    await websocket.send_bytes(part.inline_data.data)
                                    
                        if content.interrupted:
                            await websocket.send_json({"type": "interrupted"})
                            
                except Exception as e:
                    print(f"Error receiving from Gemini: {e}")

            await asyncio.gather(
                receive_from_client(),
                send_to_client()
            )
    except Exception as e:
        print(f"Gemini connection error: {e}")
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
