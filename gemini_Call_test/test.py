import asyncio
import os
import queue
import threading

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
    raise RuntimeError("GEMINI_API_KEY is missing from .env")

MODEL = "gemini-3.1-flash-live-preview"

INPUT_RATE = 16000
OUTPUT_RATE = 24000

CHANNELS = 1
BLOCK_SIZE = 1600


# ============================================================
# AUDIO
# ============================================================

mic_queue = queue.Queue()

speaker_buffer = bytearray()
speaker_lock = threading.Lock()


# ============================================================
# MICROPHONE
# ============================================================

def microphone_callback(indata, frames, time_info, status):

    if status:
        print(f"\n[MIC] {status}")

    mic_queue.put(bytes(indata))


# ============================================================
# SPEAKER
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

async def send_audio(session, sending):

    while True:

        audio = await asyncio.to_thread(
            mic_queue.get
        )

        if sending.is_set():

            await session.send_realtime_input(
                audio=types.Blob(
                    data=audio,
                    mime_type="audio/pcm;rate=16000",
                )
            )


# ============================================================
# GEMINI → SPEAKER
# ============================================================

async def receive_audio(session):

    async for response in session.receive():

        if not response.server_content:
            continue

        content = response.server_content


        # USER TRANSCRIPTION
        if content.input_transcription:

            text = content.input_transcription.text

            if text:

                print(f"\n🎙 YOU: {text}")


        # GEMINI TRANSCRIPTION
        if content.output_transcription:

            text = content.output_transcription.text

            if text:

                print(f"\n🤖 MARCUS: {text}")


        # GEMINI AUDIO
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


        # INTERRUPTION
        if content.interrupted:

            print("\n⚡ INTERRUPTED")

            with speaker_lock:

                speaker_buffer.clear()


        # TURN COMPLETE
        if content.turn_complete:

            print(
                "\n────────────────────────────"
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

        "system_instruction": (
            "You are Marcus, a friendly AI assistant. "
            "Have a natural conversation. "
            "Keep your responses short and conversational."
        ),

        "realtime_input_config": {

            "automatic_activity_detection": {

                "disabled": True

            }

        }
    }


    print()
    print("============================================")
    print(" GEMINI LIVE V4.1")
    print(" MANUAL TURN TEST")
    print("============================================")
    print()

    print("Connecting...")


    async with client.aio.live.connect(

        model=MODEL,

        config=config,

    ) as session:

        print("🟢 CONNECTED")
        print()


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


        # Whether microphone audio is currently
        # being sent to Gemini.
        sending = threading.Event()


        # Start the continuous audio sender.
        sender_task = asyncio.create_task(
            send_audio(
                session,
                sending
            )
        )


        receiver_task = asyncio.create_task(
            receive_audio(session)
        )


        try:

            while True:

                print()
                print("Press ENTER to start speaking.")

                await asyncio.to_thread(
                    input
                )


                # ------------------------------------------------
                # START USER TURN
                # ------------------------------------------------

                print()
                print("🎙 SPEAK NOW")
                print("Press ENTER when finished.")
                print()


                await session.send_realtime_input(
                    activity_start={}
                )

                sending.set()


                # Wait for ENTER
                await asyncio.to_thread(
                    input
                )


                # ------------------------------------------------
                # END USER TURN
                # ------------------------------------------------

                sending.clear()


                await session.send_realtime_input(
                    activity_end={}
                )


                print()
                print("🎧 Waiting for Marcus...")


        except KeyboardInterrupt:

            print("\nStopping...")


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

        print("\nConversation ended.")