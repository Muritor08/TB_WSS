import asyncio
import websockets
import zlib
import struct
import json
from typing import Callable, Optional
from binaryDefaultSpec import *


# =====================================================
# Optional UI log emitter (SAFE)
# =====================================================
ui_log_callback: Optional[Callable[[str], None]] = None

def emit_log(message: str):
    print(message)
    if ui_log_callback:
        ui_log_callback(message)


def normalize_base_url(base_url: str) -> str:
    return base_url.replace("https://", "").replace("http://", "")


# =====================================================
# Binary helpers (UNCHANGED)
# =====================================================
def ab2str(buf, offset, length):
    return struct.unpack(f'{length}s', buf[offset:offset+length])[0].decode('utf-8').rstrip('\x00')


def decodeL1PKT(pktSpec, pktLen, data):
    rawData = {}
    precision = 2
    idx = 3

    while idx < pktLen[0]:
        pktKey = struct.unpack('B', data[idx:idx+1])[0]
        idx += 1
        spec = pktSpec[pktKey]

        if spec["type"] == "int32":
            v = struct.unpack('i', data[idx:idx+4])[0]
        elif spec["type"] == "int64":
            v = struct.unpack('q', data[idx:idx+8])[0]
        elif spec["type"] == "float":
            v = struct.unpack('d', data[idx:idx+8])[0]
        elif spec["type"] == "uint8":
            v = struct.unpack('B', data[idx:idx+1])[0]
            if spec["key"] == "precision":
                precision = v
        elif spec["type"] == "string":
            v = ab2str(data, idx, spec["len"])
        else:
            v = None

        if spec["type"] != "string" and spec["key"] != "precision":
            rawData[spec["key"]] = spec["fmt"](v, precision) if "fmt" in spec else v
        elif spec["type"] == "string":
            rawData[spec["key"]] = v

        idx += spec["len"]

    return rawData


def decodePKT(data):
    pktLen = struct.unpack('h', data[0:2])
    pktType = struct.unpack('b', data[2:3])[0]
    pktSpec = DEFAULT_PKT_INFO["PKT_SPEC"]

    if pktType not in pktSpec:
        emit_log(f"⚠️ Unknown packet type: {pktType}")
        return None

    if PKT_TYPE[pktType] == QUOTE:
        decoded = decodeL1PKT(pktSpec[pktType], pktLen, data)
        emit_log(f"📊 Decoded Data: {decoded}")
        return decoded

    return None


def decompress_and_decode(data):
    algo = struct.unpack('b', data[4:5])[0]
    if algo == 10:
        decompressed = zlib.decompress(data[5:])
    else:
        decompressed = data[5:]
    return decodePKT(decompressed)


# =====================================================
# MAIN SOCKET CONNECTOR
# =====================================================
async def connect_ws(
    baseURL: str,
    token: str,
    api_key: str,
    log_callback: Callable[[str], None] = None,
):
    global ui_log_callback
    ui_log_callback = log_callback

    uri = f"wss://{normalize_base_url(baseURL)}/market-stream?token={token}&apikey={api_key}"

    try:
        async with websockets.connect(uri) as websocket:
            emit_log("✅ Connected to TradeBridge WebSocket")

            subscribe_msg = {
                "request": {
                    "streaming_type": "quote",
                    "request_type": "subscribe",
                    "data": {
                        "symbols": [{"symbol": "2885_NSE"}]
                    }
                }
            }

            await websocket.send(json.dumps(subscribe_msg) + "\n")
            emit_log("📨 Subscription message sent.")

            while True:
                try:
                    emit_log("📥 Waiting for data...")
                    data = await asyncio.wait_for(websocket.recv(), timeout=10)

                    if isinstance(data, bytes):
                        decompress_and_decode(data)
                    else:
                        emit_log(f"⚠️ Server response (non-binary): {data}")

                except asyncio.TimeoutError:
                    emit_log("⏳ No data received in 10 seconds, continuing to wait...")

                except asyncio.CancelledError:
                    emit_log("🛑 WebSocket cancelled.")
                    break

                except Exception as e:
                    emit_log(f"❌ Error while receiving data: {e}")
                    break

    except Exception as e:
        emit_log(f"❌ Failed to connect to WebSocket: {e}")
