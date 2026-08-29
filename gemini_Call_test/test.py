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
INPUT_BLOCK_SIZE = 1600       # ~100ms at 16kHz


# ============================================================
# AUDIO BUFFERS
# ============================================================

mic_queue = queue.Queue()

# This is important:
# We keep ALL Gemini audio bytes here and consume them
# sequentially instead of treating every Gemini chunk
# as a complete speaker buffer.
speaker_buffer = bytearray()

speaker_lock = threading.Lock()


# ============================================================
# MICROPHONE
# ============================================================

def microphone_callback(indata, frames, time, status):

    if status:
        print(f"\n[MIC STATUS] {status}")

    print(".", end="", flush=True)

    mic_queue.put(bytes(indata))


# ============================================================
# SPEAKER
# ============================================================

def speaker_callback(outdata, frames, time, status):

    if status:
        print(f"\n[SPEAKER STATUS] {status}")

    bytes_needed = frames * 2  # int16 = 2 bytes

    with speaker_lock:

        if len(speaker_buffer) >= bytes_needed:

            data = speaker_buffer[:bytes_needed]

            del speaker_buffer[:bytes_needed]

        else:

            data = bytes(speaker_buffer)

            speaker_buffer.clear()

            data += b"\x00" * (bytes_needed - len(data))

    outdata[:] = data


# ============================================================
# SEND MICROPHONE → GEMINI
# ============================================================

async def microphone_sender(session):

    while True:

        audio_chunk = await asyncio.to_thread(
            mic_queue.get
        )

        await session.send_realtime_input(
            audio=types.Blob(
                data=audio_chunk,
                mime_type="audio/pcm;rate=16000",
            )
        )


# ============================================================
# GEMINI → SPEAKER + TRANSCRIPTS
# ============================================================

async def gemini_receiver(session):

    global speaker_buffer

    async for response in session.receive():

        server_content = response.server_content

        if not server_content:
            continue


        # ----------------------------------------------------
        # USER TRANSCRIPTION
        # ----------------------------------------------------

        if server_content.input_transcription:

            text = server_content.input_transcription.text

            if text:
                print(f"\n🎙 YOU: {text}")


        # ----------------------------------------------------
        # GEMINI TRANSCRIPTION
        # ----------------------------------------------------

        if server_content.output_transcription:

            text = server_content.output_transcription.text

            if text:
                print(f"\n🤖 MARCUS: {text}")


        # ----------------------------------------------------
        # GEMINI AUDIO
        # ----------------------------------------------------

        model_turn = server_content.model_turn

        if model_turn:

            for part in model_turn.parts:

                if part.inline_data and part.inline_data.data:

                    audio_data = part.inline_data.data

                    with speaker_lock:

                        speaker_buffer.extend(audio_data)


        # ----------------------------------------------------
        # INTERRUPTION
        # ----------------------------------------------------

        if server_content.interrupted:

            print("\n⚡ INTERRUPTED")


        # ----------------------------------------------------
        # TURN COMPLETE
        # ----------------------------------------------------

        if server_content.turn_complete:

            print("\n────────────────────────────")


# ============================================================
# MAIN
# ============================================================

async def main():

    client = genai.Client(api_key=API_KEY)

    config = {
        "response_modalities": ["AUDIO"],

        "input_audio_transcription": {},

        "output_audio_transcription": {},

        "system_instruction": (
            "You are Marcus, a friendly AI assistant. "

            "Have a natural voice conversation with the user. "

            "Keep responses conversational and reasonably short. "

            "Do not give long speeches. "

            "If the user interrupts you, stop and listen."
        ),
    }


    print()
    print("============================================")
    print("       GEMINI LIVE VOICE TEST V2")
    print("============================================")
    print()

    print("Connecting...")


    async with client.aio.live.connect(
        model=MODEL,
        config=config,
    ) as session:

        print("🟢 Connected to Gemini Live")
        print()
        print("🎙 Microphone: ON")
        print("🔊 Speaker: ON")
        print()
        print("Talk normally.")
        print("Press CTRL+C to stop.")
        print()
        print("============================================")
        print()


        # ----------------------------------------------------
        # AUDIO DEVICES
        # ----------------------------------------------------

        mic_stream = sd.RawInputStream(

            samplerate=INPUT_RATE,

            blocksize=INPUT_BLOCK_SIZE,

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


        try:

            await asyncio.gather(

                microphone_sender(session),

                gemini_receiver(session),

            )

        finally:

            mic_stream.stop()
            mic_stream.close()

            speaker_stream.stop()
            speaker_stream.close()


# ============================================================
# START
# ============================================================

if __name__ == "__main__":

    try:

        asyncio.run(main())

    except KeyboardInterrupt:

        print()
        print("Conversation ended.")