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

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY missing")

LIVE_MODEL = "gemini-3.1-flash-live-preview"
SUMMARY_MODEL = "gemini-3.5-flash-lite"

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

    speaking = False
    last_voice_time = 0

    print("\n🎙 LISTENING...\n")

    while True:

        audio = await asyncio.to_thread(
            mic_queue.get
        )

        volume = audioop.rms(
            audio,
            2
        )

        now = time.monotonic()


        # ----------------------------------------------------
        # SPEECH START
        # ----------------------------------------------------

        if volume > VOICE_THRESHOLD:

            if not speaking:

                speaking = True

                print(
                    "\n🎙 SPEECH START"
                )

            last_voice_time = now


        # ----------------------------------------------------
        # SEND ONLY WHILE SPEAKING
        # ----------------------------------------------------

        if speaking:

            await session.send_realtime_input(
                audio=types.Blob(
                    data=audio,
                    mime_type="audio/pcm;rate=16000",
                )
            )


        # ----------------------------------------------------
        # SPEECH END
        # ----------------------------------------------------

        if speaking:

            if (
                now - last_voice_time
                >= SILENCE_DURATION
            ):

                speaking = False

                print(
                    "\n🎙 SPEECH END"
                )

                print(
                    "🎧 Waiting for Gemini..."
                )

                await session.send_realtime_input(
                    audio_stream_end=True
                )


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


    config = {

        "response_modalities": ["AUDIO"],

        "input_audio_transcription": {},

        "output_audio_transcription": {},

        "system_instruction": """
You are Marcus, an AI assistant calling on behalf of an employer.

IMPORTANT:
This is a SOFTWARE ENGINEERING screening call.

The employer is looking for a software engineer who can build
websites and web applications.

Your job is to learn about the candidate's technical background.

Ask about:

- Programming languages they use
- Frameworks and technologies they use
- What websites or web applications they can build
- Their frontend/backend/full-stack experience
- Their strongest technical skills
- Types of software projects they enjoy
- Their preferred type of engineering work
- Their previous relevant projects
- Their availability for new work

Do NOT ask about politics, elections, voting, movies, acting,
religion, personal political opinions, or unrelated personal topics.

Ask ONE question at a time.

Have a natural conversation rather than reading a questionnaire.

If the candidate asks why you are asking a question, explain that
you are trying to understand their technical background for the
software engineering opportunity.

If the candidate asks about the project and you don't have specific
project information, say that you don't have those details.

If the candidate asks about compensation and you don't have
compensation information, say that you don't have it.

If the candidate asks a question, answer it when possible and then
return to the previous unanswered screening question.

Never invent project details, compensation, company information,
or requirements.

You are Marcus, an AI assistant. You are NOT the employer.

Keep responses concise and conversational.
"""

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