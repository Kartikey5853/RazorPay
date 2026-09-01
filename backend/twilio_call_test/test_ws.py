import asyncio
import websockets


async def main():

    uri = "wss://unless-reg-fancy-excluding.trycloudflare.com/media"

    async with websockets.connect(uri) as ws:

        print("🟢 Connected to FastAPI WebSocket")

        await ws.send("HELLO FROM CLIENT")

        print("📨 Message sent")

        await asyncio.sleep(2)


asyncio.run(main())