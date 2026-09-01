import sounddevice as sd
from scipy.io.wavfile import write

SAMPLE_RATE = 16000
CHANNELS = 1


def record(filename):

    input("Press ENTER, then speak. Press ENTER again when done.")

    print("🎙 Recording...")

    audio = sd.rec(
        int(10 * SAMPLE_RATE),
        samplerate=SAMPLE_RATE,
        channels=CHANNELS,
        dtype="int16",
    )

    input("Press ENTER to stop recording.")

    sd.stop()

    write(
        filename,
        SAMPLE_RATE,
        audio,
    )

    print(f"Saved {filename}")


record("gemini_Call_test/turn1.wav")
record("gemini_Call_test/turn2.wav")