from fastapi import FastAPI, WebSocket

app = FastAPI()


@app.get("/")
async def root():
    return {"status": "online"}


@app.post("/telnyx/webhook")
async def telnyx_webhook():
    print("📞 Telnyx webhook received")
    return {"status": "received"}


@app.websocket("/media")
async def media(websocket: WebSocket):

    await websocket.accept()

    print("🟢 WebSocket connected")

    try:

        while True:

            message = await websocket.receive_text()

            print("📨 Received:", message)

    except Exception as e:

        print("🔴 WebSocket disconnected:", e)