"""Gemini-backed call assistant configuration, isolated from the main API logic."""
import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

MODEL = "gemini-3.5-flash-lite"
SYSTEM_PROMPT = """
You are helping a business owner configure an AI calling agent. Ask concise, practical
clarifying questions, one or two at a time. Identify the objective, target person,
information to collect, qualification criteria, conversation rules, disqualification
conditions, call-end conditions, and follow-up. Do not invent requirements or return JSON
during the conversation.
"""

class AgentConfig(BaseModel):
    objective: str
    target_person: str
    required_information: list[str]
    qualification_criteria: list[str]
    conversation_rules: list[str]
    disqualification_conditions: list[str]
    call_end_conditions: list[str]
    follow_up: list[str]

def _client() -> genai.Client:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY is missing from backend/.env")
    return genai.Client(api_key=key)

def _transcript(messages: list[dict[str, str]]) -> str:
    return "\n".join(f"{'OWNER' if item['role'] == 'user' else 'ASSISTANT'}: {item['text']}" for item in messages)

def next_question(messages: list[dict[str, str]]) -> str:
    prompt = f"{SYSTEM_PROMPT}\n\nConversation so far:\n{_transcript(messages)}\n\nReply with the next concise clarification only."
    client = _client()
    response = client.models.generate_content(model=MODEL, contents=prompt)
    if not response.text:
        raise RuntimeError("Gemini did not return a configuration response.")
    return response.text

def generate_config(messages: list[dict[str, str]]) -> dict:
    prompt = f"""Convert this completed configuration conversation into the final configuration for an AI calling agent.
Use only requirements explicitly stated or agreed to by the owner. Do not invent missing information.

CONFIGURATION CONVERSATION:
{_transcript(messages)}
"""
    client = _client()
    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config={"response_mime_type": "application/json", "response_schema": AgentConfig},
    )
    if response.parsed is None:
        raise RuntimeError("Gemini failed to generate a structured configuration.")
    return response.parsed.model_dump()
