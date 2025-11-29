import asyncio
import threading
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Set

from Params_connect_socket import connect_ws

# ======================================================
# APP INIT
# ======================================================
app = FastAPI()

# ✅ CORRECT CORS CONFIG (BROWSER SAFE)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://tradebridgewss.vercel.app",  # ✅ Frontend
    ],
    allow_credentials=False,  # ✅ MUST be False with explicit origin
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
# THREAD-SAFE LOG BROADCAST
# ======================================================
def broadcast_log(message: str):
    try:
        loop = asyncio.get_event_loop()
        for ws in list(ui_clients):
            if ws.client_state.name == "CONNECTED":
                loop.call_soon_threadsafe(
                    asyncio.create_task,
                    ws.send_text(message)
                )
    except RuntimeError:
        pass


# ======================================================
# SOCKET RUNNER
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
# API ROUTES
# ======================================================
@app.options("/{path:path}")
def preflight_handler():
    # ✅ Explicit OPTIONS support (fixes CORS preflight)
    return {}


@app.post("/start-socket")
def start_socket(req: SocketRequest):
    global socket_thread

    if socket_thread and socket_thread.is_alive():
        return {"success": True, "message": "Socket already running"}

    socket_thread = threading.Thread(
        target=run_socket,
        args=(req.baseUrl, req.accessToken, req.apiKey),
        daemon=True,
    )
    socket_thread.start()

    return {"success": True, "message": "Socket started"}


@app.get("/status")
def get_status():
    return status


# ======================================================
# LOG STREAM (WSS)
# ======================================================
@app.websocket("/logs")
async def logs(ws: WebSocket):
    await ws.accept()
    ui_clients.add(ws)
    try:
        while True:
            await ws.receive_text()
    except:
        pass
    finally:
        ui_clients.remove(ws)
