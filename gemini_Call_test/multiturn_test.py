import asyncio
import os
import wave

from dotenv import load_dotenv
from google import genai
from google.genai import types


load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY missing")


MODEL = "gemini-3.1-flash-live-preview"


def wav_to_pcm(filename):

    with wave.open(filename, "rb") as wav:

        sample_rate = wav.getframerate()
        channels = wav.getnchannels()
        sample_width = wav.getsampwidth()

        audio = wav.readframes(
            wav.getnframes()
        )

    print(
        f"{filename}: "
        f"{sample_rate}Hz, "
        f"{channels} channel, "
        f"{sample_width * 8}-bit"
    )

    return audio


async def receive_turn(session):

    print("\n🤖 Waiting for Gemini...\n")

    async for response in session.receive():

        if not response.server_content:
            continue

        content = response.server_content

        # User transcript
        if content.input_transcription:

            text = content.input_transcription.text

            if text:
                print(f"🎙 YOU: {text}")

        # Gemini transcript
        if content.output_transcription:

            text = content.output_transcription.text

            if text:
                print(f"🤖 MARCUS: {text}")

        # We don't need to play audio for this test.
        # We're only testing whether Gemini can process
        # multiple audio turns in one session.

        if content.turn_complete:

            print("\n✅ TURN COMPLETE")

            break


async def main():

    client = genai.Client(
        api_key=API_KEY
    )

    config = {
        "response_modalities": ["AUDIO"],
        "input_audio_transcription": {},
        "output_audio_transcription": {},
    }

    turn1 = wav_to_pcm(
        "gemini_Call_test/turn1.wav"
    )

    turn2 = wav_to_pcm(
        "gemini_Call_test/turn2.wav"
    )

    print("\nConnecting...")

    async with client.aio.live.connect(
        model=MODEL,
        config=config,
    ) as session:

        print("🟢 CONNECTED\n")

        # ====================================================
        # TURN 1
        # ====================================================

        print("========== TURN 1 ==========")

        await session.send_realtime_input(
            audio=types.Blob(
                data=turn1,
                mime_type="audio/pcm;rate=16000",
            )
        )

        await receive_turn(session)


        # ====================================================
        # TURN 2
        # ====================================================

        print("\n========== TURN 2 ==========")

        await session.send_realtime_input(
            audio=types.Blob(
                data=turn2,
                mime_type="audio/pcm;rate=16000",
            )
        )

        await receive_turn(session)


        print("\n========== DONE ==========")


if __name__ == "__main__":

    asyncio.run(main())