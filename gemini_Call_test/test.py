import asyncio
import os
import queue
import threading
import time
import audioop

import sounddevice as sd
from dotenv import load_dotenv
from google import genai
from google.genai import types


# ============================================================
# CONFIG
# ============================================================

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY missing")

MODEL = "gemini-3.1-flash-live-preview"

INPUT_RATE = 16000
OUTPUT_RATE = 24000

CHANNELS = 1
BLOCK_SIZE = 1600       # 100ms

VOICE_THRESHOLD = 500
SILENCE_DURATION = 0.65


# ============================================================
# AUDIO QUEUES
# ============================================================

mic_queue = queue.Queue()

speaker_buffer = bytearray()
speaker_lock = threading.Lock()


# ============================================================
# MICROPHONE CALLBACK
# ============================================================

def microphone_callback(indata, frames, time_info, status):

    if status:
        print(f"\n[MIC] {status}")

    mic_queue.put(bytes(indata))


# ============================================================
# SPEAKER CALLBACK
# ============================================================

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
        # ONLY SEND AUDIO WHILE SPEAKING
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
# GEMINI → SPEAKER
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

                text = content.input_transcription.text

                if text:
                    print(f"\n🎙 YOU: {text}")


            # ------------------------------------------------
            # GEMINI TRANSCRIPTION
            # ------------------------------------------------

            if content.output_transcription:

                text = content.output_transcription.text

                if text:
                    print(f"\n🤖 MARCUS: {text}")


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

                print("\n⚡ MARCUS INTERRUPTED")

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

        # session.receive() ended after turn_complete.
        # Re-enter it for the next turn.
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

        "system_instruction": (
            "You are Marcus. "
            "Have a natural conversation. "
            "Keep responses short. "
            "Do not give long speeches."
        ),

    }


    print()
    print("============================================")
    print("       GEMINI LIVE VOICE TEST V6")
    print("============================================")
    print()

    print("Connecting...")


    async with client.aio.live.connect(

        model=MODEL,

        config=config,

    ) as session:

        print("🟢 CONNECTED")

        print()
        print("🎙 Microphone ON")
        print("🔊 Speaker ON")
        print()
        print("Talk normally.")
        print("Press CTRL+C to stop.")
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

        finally:

            sender_task.cancel()
            receiver_task.cancel()

            mic_stream.stop()
            mic_stream.close()

            speaker_stream.stop()
            speaker_stream.close()


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    try:

        asyncio.run(main())

    except KeyboardInterrupt:

        print(
            "\n\nConversation ended."
        )