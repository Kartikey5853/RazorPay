import asyncio
import os
import queue
import threading
import time
import audioop
import json

import sounddevice as sd
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import List, Optional


# ============================================================
# CONFIG
# ============================================================
THRESHOLD = 500
SILENCE_DURATION = 0.65
load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY missing")

LIVE_MODEL = "gemini-3.1-flash-live-preview"
SUMMARY_MODEL = "gemini-3.5-flash-lite"

CONFIG_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    "configuration_test",
    "agent_config.json"
)

INPUT_RATE = 16000
OUTPUT_RATE = 24000

CHANNELS = 1
BLOCK_SIZE = 1600

VOICE_THRESHOLD = 500
SILENCE_DURATION = 0.65


# ============================================================
# AUDIO
# ============================================================

mic_queue = queue.Queue()

speaker_buffer = bytearray()
speaker_lock = threading.Lock()


def microphone_callback(indata, frames, time_info, status):

    if status:
        print(f"\n[MIC] {status}")

    mic_queue.put(bytes(indata))


def speaker_callback(outdata, frames, time_info, status):

    if status:
        print(f"\n[SPEAKER] {status}")

    bytes_needed = frames * 2

    with speaker_lock:

        if len(speaker_buffer) >= bytes_needed:

            data = speaker_buffer[:bytes_needed]
            del speaker_buffer[:bytes_needed]

        else:

            data = bytes(speaker_buffer)
            speaker_buffer.clear()

            data += b"\x00" * (
                bytes_needed - len(data)
            )

    outdata[:] = data


# ============================================================
# CALL TRANSCRIPT
# ============================================================

conversation = []

conversation_lock = threading.Lock()


def add_user_message(text):

    with conversation_lock:

        conversation.append({
            "speaker": "candidate",
            "text": text
        })


def add_ai_message(text):

    with conversation_lock:

        conversation.append({
            "speaker": "marcus",
            "text": text
        })


def get_transcript():

    with conversation_lock:

        lines = []

        for message in conversation:

            speaker = message["speaker"].upper()

            lines.append(
                f"{speaker}: {message['text']}"
            )

        return "\n".join(lines)


# ============================================================
# MICROPHONE → GEMINI
# ============================================================

async def microphone_sender(session):
    print("🎙 Microphone ON")

    speaking = False
    silence_start = None

    while True:
        data = await asyncio.to_thread(mic_queue.get)

        rms = audioop.rms(data, 2)

        # -----------------------------------------
        # SPEECH DETECTED
        # -----------------------------------------
        if rms > THRESHOLD:

            if not speaking:
                speaking = True
                silence_start = None
                print("\n🎙 SPEAKING...")

            silence_start = None

            await session.send_realtime_input(
                audio=types.Blob(
                    data=data,
                    mime_type="audio/pcm;rate=16000"
                )
            )

        # -----------------------------------------
        # SILENCE WHILE SPEAKING
        # -----------------------------------------
        elif speaking:

            if silence_start is None:
                silence_start = time.time()

            silence_duration = time.time() - silence_start

            # User has stopped speaking
            if silence_duration >= SILENCE_DURATION:

                print("\n🎙 SPEECH END")
                print("⏳ Waiting 3 seconds before sending...")

                await asyncio.sleep(3)

                print("🎧 Sending to Gemini...")

                await session.send_realtime_input(
                    audio_stream_end=True
                )

                # IMPORTANT:
                # We are now waiting for the NEXT utterance.
                speaking = False
                silence_start = None

        # -----------------------------------------
        # OTHERWISE: KEEP WAITING
        # -----------------------------------------
        else:
            continue

# ============================================================
# GEMINI → SPEAKER + TRANSCRIPT
# ============================================================

async def gemini_receiver(session):

    global speaker_buffer

    while True:

        async for response in session.receive():

            if not response.server_content:
                continue

            content = response.server_content


            # ------------------------------------------------
            # USER TRANSCRIPTION
            # ------------------------------------------------

            if content.input_transcription:

                text = (
                    content
                    .input_transcription
                    .text
                )

                if text:

                    print(
                        f"\n🎙 YOU: {text}"
                    )

                    add_user_message(text)


            # ------------------------------------------------
            # GEMINI TRANSCRIPTION
            # ------------------------------------------------

            if content.output_transcription:

                text = (
                    content
                    .output_transcription
                    .text
                )

                if text:

                    print(
                        f"\n🤖 MARCUS: {text}"
                    )

                    add_ai_message(text)


            # ------------------------------------------------
            # GEMINI AUDIO
            # ------------------------------------------------

            if content.model_turn:

                for part in content.model_turn.parts:

                    if (
                        part.inline_data
                        and part.inline_data.data
                    ):

                        with speaker_lock:

                            speaker_buffer.extend(
                                part.inline_data.data
                            )


            # ------------------------------------------------
            # INTERRUPTION
            # ------------------------------------------------

            if content.interrupted:

                print(
                    "\n⚡ MARCUS INTERRUPTED"
                )

                with speaker_lock:

                    speaker_buffer.clear()


            # ------------------------------------------------
            # TURN COMPLETE
            # ------------------------------------------------

            if content.turn_complete:

                print(
                    "\n────────────────────────────"
                )

                print(
                    "🎙 Ready for next turn"
                )


# ============================================================
# STRUCTURED SUMMARY SCHEMA
# ============================================================

class Question(BaseModel):

    question: str

    answered: str = Field(
        description=(
            "Use exactly one of: "
            "'yes', 'no', or 'partial'. "
            "'yes' means fully answered. "
            "'no' means unanswered. "
            "'partial' means only partly answered."
        )
    )

    answer: Optional[str]


class PersonInfo(BaseModel):

    skills: List[str]

    experience: List[str]

    interests: List[str]

    availability: Optional[str]

    compensation: Optional[str]


class Action(BaseModel):

    required: bool

    type: Optional[str]

    reason: Optional[str]


class CallResult(BaseModel):

    call_outcome: str = Field(
    description=(
        "Use exactly one of: "
        "'interested', "
        "'not_interested', "
        "'needs_follow_up', "
        "'qualified', "
        "'unqualified'."
    )
)

    summary: List[str]

    information_collected: PersonInfo

    questions_from_contact: List[Question] = Field(
    description=(
        "Meaningful questions asked by the candidate about the "
        "opportunity, project, compensation, requirements, or "
        "next steps. Preserve their actual meaning. "
        "Exclude conversational filler."
    )
    )

    unanswered: List[str]

    next_action: Optional[str]

    action: Action

# ============================================================
# Config loader
# ============================================================
def load_agent_config():

    if not os.path.exists(CONFIG_PATH):

        raise FileNotFoundError(
            f"Agent configuration not found: {CONFIG_PATH}"
        )

    with open(
        CONFIG_PATH,
        "r",
        encoding="utf-8"
    ) as file:

        return json.load(file)


def build_agent_instructions(agent_config):

    return f"""
You are Marcus, an AI calling assistant.

Follow the owner's configuration below.

================ OWNER CONFIGURATION ================

OBJECTIVE:
{agent_config["objective"]}

TARGET PERSON:
{agent_config["target_person"]}

REQUIRED INFORMATION:
{json.dumps(agent_config["required_information"], indent=2)}

QUALIFICATION CRITERIA:
{json.dumps(agent_config["qualification_criteria"], indent=2)}

CONVERSATION RULES:
{json.dumps(agent_config["conversation_rules"], indent=2)}

DISQUALIFICATION CONDITIONS:
{json.dumps(agent_config["disqualification_conditions"], indent=2)}

CALL END CONDITIONS:
{json.dumps(agent_config["call_end_conditions"], indent=2)}

FOLLOW-UP:
{json.dumps(agent_config["follow_up"], indent=2)}

================ BEHAVIOR ================

The configuration above is the source of truth.

Your job is to accomplish the objective naturally through
conversation.

Ask one question at a time.

Collect the required information naturally rather than reading
a questionnaire.

If the person asks a question, answer it when the configuration
contains enough information to answer it.

If the configuration does not provide an answer, do not invent one.

Never invent:
- compensation
- project requirements
- company information
- deadlines
- promises
- qualifications

Follow the qualification criteria.

Follow the disqualification conditions.

Follow the call-end conditions.

If the person is not a fit, politely explain the relevant reason
when appropriate and end the call.

If the person is a fit and the configuration specifies a
follow-up, communicate that naturally.

Keep responses concise and conversational.

Do not discuss topics unrelated to the owner's objective.
"""

# ============================================================
# CALL SUMMARY
# ============================================================

async def generate_call_summary():

    print()
    print()
    print("============================================")
    print("         GENERATING CALL SUMMARY")
    print("============================================")
    print()

    transcript = get_transcript()

    print("Transcript:")
    print()
    print(transcript)
    print()


    client = genai.Client(
        api_key=API_KEY
    )


    prompt = f"""
Analyze this completed business call.

MARCUS is the AI/business representative.
CANDIDATE is the person being contacted.

Create an accurate business record.

STRICT RULES:

1. The CANDIDATE is the person whose information matters.
   Do not confuse Marcus's statements with candidate facts.

2. Extract every important fact explicitly stated by the candidate.

3. NEVER use null when the candidate explicitly provided the
   information somewhere in the transcript.

4. Preserve concrete details.

   For example, if the candidate describes a project,
   capture what the project actually does, not merely:
   "built a web application."

5. Capture:
   - programming languages
   - frameworks
   - technical skills
   - previous projects
   - project details
   - domains worked in
   - preferred work
   - interests
   - availability
   - compensation information

6. Capture meaningful questions asked by the candidate.

7. Preserve the candidate's actual question meaning.
   Do not replace their question with a different question.

8. If one candidate utterance contains multiple questions,
   represent each meaningful question separately when possible.

9. For each question:
   - "yes" = fully answered
   - "no" = not answered
   - "partial" = partially answered

10. If Marcus says he does not know something, that question
    remains unanswered.

11. Do not classify conversational filler as a business question.

    Examples:
    "Okay, are we done?"
    "How are you?"
    "Thanks."

    These should not be included.

12. call_outcome must represent the BUSINESS outcome.

    Use:
    - interested
    - not_interested
    - needs_follow_up
    - qualified
    - unqualified

    Do NOT use "completed".

13. Use "needs_follow_up" when the candidate is interested
    but important information still needs to be discussed.

14. The summary must contain EXACTLY 5 or 6 bullets.

15. The summary should prioritize:
    - strongest skills
    - concrete experience/projects
    - preferences/interests
    - availability
    - important concerns/questions
    - next action

16. next_action must describe what the business should actually do.

17. Never invent:
    - salary
    - project requirements
    - company information
    - deadlines
    - candidate experience
    - candidate qualifications

18. Only use information present in the transcript.
TRANSCRIPT:

{transcript}
"""


    response = client.models.generate_content(

        model=SUMMARY_MODEL,

        contents=prompt,

        config={

            "response_mime_type": "application/json",

            "response_schema": CallResult,

        },

    )


    result = response.parsed


    if result is None:

        raise RuntimeError(
            "Gemini did not return structured output."
        )


    # ========================================================
    # SUMMARY
    # ========================================================

    print()
    print("============================================")
    print("             CALL SUMMARY")
    print("============================================")
    print()

    for bullet in result.summary:

        print(
            f"• {bullet}"
        )


    # ========================================================
    # JSON
    # ========================================================

    print()
    print("============================================")
    print("          STRUCTURED CALL JSON")
    print("============================================")
    print()

    print(
        result.model_dump_json(
            indent=2
        )
    )


    # ========================================================
    # SAVE JSON
    # ========================================================

    with open(
        "call_result.json",
        "w",
        encoding="utf-8"
    ) as file:

        file.write(
            result.model_dump_json(
                indent=2
            )
        )


    print()
    print(
        "💾 Saved to call_result.json"
    )


# ============================================================
# MAIN
# ============================================================

async def main():

    client = genai.Client(
        api_key=API_KEY
    )

    agent_config = load_agent_config()

    agent_instructions = build_agent_instructions(
        agent_config
    )

    config = {

        "response_modalities": ["AUDIO"],

        "input_audio_transcription": {},

        "output_audio_transcription": {},

        "system_instruction": agent_instructions

    }


    print()
    print("============================================")
    print("       GEMINI LIVE BUSINESS CALL")
    print("============================================")
    print()

    print("Connecting...")


    async with client.aio.live.connect(

        model=LIVE_MODEL,

        config=config,

    ) as session:

        print("🟢 CONNECTED")

        print()
        print("🎙 Microphone ON")
        print("🔊 Speaker ON")
        print()
        print("Talk normally.")
        print()
        print("Press CTRL+C to end the call.")
        print()
        print("============================================")


        mic_stream = sd.RawInputStream(

            samplerate=INPUT_RATE,

            blocksize=BLOCK_SIZE,

            channels=CHANNELS,

            dtype="int16",

            callback=microphone_callback,

        )


        speaker_stream = sd.RawOutputStream(

            samplerate=OUTPUT_RATE,

            blocksize=0,

            channels=CHANNELS,

            dtype="int16",

            callback=speaker_callback,

        )


        mic_stream.start()
        speaker_stream.start()


        sender_task = asyncio.create_task(
            microphone_sender(session)
        )

        receiver_task = asyncio.create_task(
            gemini_receiver(session)
        )


        try:

            await asyncio.gather(
                sender_task,
                receiver_task
            )

        except asyncio.CancelledError:

            pass

        finally:

            sender_task.cancel()
            receiver_task.cancel()

            mic_stream.stop()
            mic_stream.close()

            speaker_stream.stop()
            speaker_stream.close()


# ============================================================
# RUN CALL
# ============================================================

if __name__ == "__main__":

    try:

        asyncio.run(main())

    except KeyboardInterrupt:

        print()
        print()
        print("📞 CALL ENDED")

        print(
            "Generating summary..."
        )

        asyncio.run(
            generate_call_summary()
        )

        print()
        print(
            "============================================"
        )

        print(
            "              DONE"
        )

        print(
            "============================================"
        )