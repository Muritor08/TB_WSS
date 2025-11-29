import asyncio
import threading
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Set

from Params_connect_socket import connect_ws

# ======================================================
# APP SETUP
# ======================================================
app = FastAPI()

# ✅ Allow both local + any public frontend (Vercel etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ✅ REQUIRED for public hosting
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================
# GLOBAL STATE
# ======================================================
ui_clients: Set[WebSocket] = set()
socket_thread = None
status = {"connected": False}


# ======================================================
# REQUEST MODEL
# ======================================================
class SocketRequest(BaseModel):
    baseUrl: str
    apiKey: str
    accessToken: str


# ======================================================
# LOG BROADCASTER (THREAD-SAFE)
# ======================================================
def broadcast_log(message: str):
    """
    Called from background thread.
    Safely sends text logs to all connected UI clients.
    """
    loop = asyncio.get_event_loop()

    for ws in list(ui_clients):
        if ws.client_state.name == "CONNECTED":
            loop.call_soon_threadsafe(
                asyncio.create_task,
                ws.send_text(message),
            )


# ======================================================
# MARKET SOCKET RUNNER (BACKGROUND THREAD)
# ======================================================
def run_socket(baseUrl: str, token: str, apiKey: str):
    status["connected"] = True
    try:
        asyncio.run(connect_ws(baseUrl, token, apiKey, broadcast_log))
    except Exception as e:
        broadcast_log(f"❌ Socket crashed: {e}")
    finally:
        status["connected"] = False


# ======================================================
# API ENDPOINTS
# ======================================================
@app.post("/start-socket")
def start_socket(req: SocketRequest):
    global socket_thread

    # ✅ Prevent duplicate socket start
    if socket_thread and socket_thread.is_alive():
        return {
            "success": True,
            "message": "Socket already running",
        }

    socket_thread = threading.Thread(
        target=run_socket,
        args=(req.baseUrl, req.accessToken, req.apiKey),
        daemon=True,
    )
    socket_thread.start()

    return {
        "success": True,
        "message": "Socket started",
    }


@app.get("/status")
def get_status():
    return status


# ======================================================
# WEBSOCKET ENDPOINT (LOG STREAM)
# ======================================================
@app.websocket("/logs")
async def logs(ws: WebSocket):
    await ws.accept()
    ui_clients.add(ws)

    try:
        # ✅ Keep socket alive, no data expected from client
        while True:
            await ws.receive_text()
    except:
        pass
    finally:
        ui_clients.remove(ws)
