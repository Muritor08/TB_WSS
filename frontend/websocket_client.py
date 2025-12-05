import asyncio
import websockets
import zlib
import struct
import json
import base64
import sys
from binaryDefaultSpec import DEFAULT_PKT_INFO, PKT_TYPE, QUOTE

# Fix Windows console encoding for emoji support
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


def ab2str(buf, offset, length):
    """Convert bytes to string, removing null bytes and trailing whitespace."""
    return struct.unpack(f'{length}s', buf[offset:offset+length])[0].decode('utf-8').rstrip('\x00')


def decodeL1PKT(pktSpec, pktLen, data):
    """Decode Level 1 packet according to the spec."""
    rawData = {}
    precision = 2
    idx = 3  # Start after packet length (2 bytes) and packet type (1 byte)
    
    # Use actual data length if packet length seems wrong
    maxLen = min(pktLen, len(data)) if pktLen > 0 else len(data)
    
    fields_decoded = 0
    while idx < maxLen:
        if idx >= len(data):
            break
            
        # Read field ID (1 byte)
        pktKey = struct.unpack('B', data[idx:idx+1])[0]
        idx += 1
        
        if pktKey not in pktSpec:
            # Unknown field, stop decoding
            if fields_decoded == 0:
                # If we haven't decoded anything, this might be wrong packet type
                print(f"[DEBUG] Unknown field ID {pktKey} at offset {idx-1}, stopping decode")
            break
            
        spec = pktSpec[pktKey]
        
        # Check if we have enough bytes remaining
        if idx + spec["len"] > len(data):
            print(f"[DEBUG] Not enough bytes for field {pktKey} ({spec['key']}), need {spec['len']} but only {len(data) - idx} available")
            break
        
        # Decode based on field type
        try:
            if spec["type"] == "int32":
                v = struct.unpack('<i', data[idx:idx+4])[0]  # Little-endian
            elif spec["type"] == "int64":
                v = struct.unpack('<q', data[idx:idx+8])[0]  # Little-endian
            elif spec["type"] == "float":
                v = struct.unpack('<d', data[idx:idx+8])[0]  # Little-endian double
            elif spec["type"] == "uint8":
                v = struct.unpack('B', data[idx:idx+1])[0]
                if spec["key"] == "precision":
                    precision = v
            elif spec["type"] == "string":
                v = ab2str(data, idx, spec["len"])
            else:
                v = None
            
            # Apply formatting if available
            if spec["type"] != "string" and spec["key"] != "precision":
                if "fmt" in spec:
                    rawData[spec["key"]] = spec["fmt"](v, precision)
                else:
                    rawData[spec["key"]] = v
            elif spec["type"] == "string":
                rawData[spec["key"]] = v
            
            fields_decoded += 1
            idx += spec["len"]
        except Exception as e:
            print(f"[ERROR] Error decoding field {pktKey} ({spec.get('key', 'unknown')}): {e}")
            break
    
    if fields_decoded > 0:
        print(f"[DEBUG] Successfully decoded {fields_decoded} fields")
    
    return rawData


def decodePKT(data):
    """Decode a binary packet."""
    if len(data) < 3:
        print("[WARNING] Packet too short")
        return
    
    # Try to read packet length and type
    # Format: [2 bytes: length][1 byte: type][...data...]
    pktLen = struct.unpack('<h', data[0:2])[0]
    pktType = struct.unpack('b', data[2:3])[0]
    
    print(f"[DEBUG] Packet length: {pktLen}, Packet type: {pktType}, Data length: {len(data)}")
    
    # Get packet spec
    pktSpec = DEFAULT_PKT_INFO["PKT_SPEC"]
    
    # Check if packet type is in spec
    if pktType in pktSpec:
        # Known packet type - decode it
        jData = decodeL1PKT(pktSpec[pktType], pktLen, data)
        if jData:
            print("\n" + "="*60)
            print(f"[DATA] Decoded Market Data (Packet Type: {pktType}):")
            print("="*60)
            print(json.dumps(jData, indent=2))
            print("="*60 + "\n")
        else:
            print("[WARNING] Decoded data is empty")
    else:
        # Unknown packet type - try common ones
        print(f"[WARNING] Unknown packet type: {pktType}")
        print(f"[DEBUG] Available packet types: {list(pktSpec.keys())}")
        
        # Try packet type 49 (quote) as fallback
        if 49 in pktSpec:
            print(f"[DEBUG] Attempting to decode as packet type 49 (quote)...")
            jData = decodeL1PKT(pktSpec[49], pktLen, data)
            if jData:
                print("\n" + "="*60)
                print("[DATA] Decoded Market Data (Fallback to type 49):")
                print("="*60)
                print(json.dumps(jData, indent=2))
                print("="*60 + "\n")
            else:
                print("[WARNING] Fallback decoding also produced empty data")
                print(f"[DEBUG] First 20 bytes (hex): {' '.join(f'{b:02x}' for b in data[:20])}")


def decompress_and_decode(data):
    """Decompress and decode binary data."""
    print(f"[DEBUG] Received {len(data)} bytes of data")
    
    # Check if data has compression header (first 5 bytes)
    if len(data) >= 5:
        # Read compression algorithm (1 byte at offset 4)
        algo = struct.unpack('b', data[4:5])[0]
        print(f"[DEBUG] Compression algorithm: {algo}")
        
        # Decompress if needed (algo 10 = zlib)
        if algo == 10:
            try:
                decompressed = zlib.decompress(data[5:])
                print(f"[DEBUG] Decompressed to {len(decompressed)} bytes")
                decodePKT(decompressed)
            except zlib.error as e:
                print(f"[ERROR] Decompression error: {e}")
                # Try decoding without decompression
                print(f"[DEBUG] Trying to decode without decompression...")
                decodePKT(data[5:])
        else:
            # No compression, decode directly (skip first 5 bytes)
            print(f"[DEBUG] No compression, decoding directly...")
            decodePKT(data[5:])
    else:
        # No header, assume raw packet
        print(f"[DEBUG] No compression header, treating as raw packet...")
        decodePKT(data)


async def connect_ws():
    """Connect to TradeBridge WebSocket and handle market data."""
    # Replace with your credentials
    access_token = "eyJhbGciOiJIUzUxMiJ9.eyJhcHAtaWQiOiIyYzFmMTM1NS0wYWZmLTQ4ZmYtYTNmNS1iZDYwYTFjMGU0OTMiLCJsaW1pdCI6IkFQMDEwMjI5NiIsInNvdXJjZSI6IlNESyIsInN1YiI6IkFQMDEwMjI5NiIsImlhdCI6MTc2NDIyMzIwNiwiZXhwIjoxNzY0MjUyMDA2fQ.Xy30ranIElt-DDpDLv_InXQq4Utb4aT_9yCwMvDlqLxlILb_73tfmfz7DheM03e5FlbJyCTBYjTnjvM8Vn5Oiw"
    api_key = "UudUXopj6QOvESfpXq"
    
    # Pass credentials via query parameters
    uri = f"wss://dc5tradebridge.arihantplus.com/market-stream?token={access_token}&apikey={api_key}"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("[SUCCESS] Connected to TradeBridge WebSocket")
            
            # Subscription message format - matching your symbols
            subscribe_msg = {
                "request": {
                    "streaming_type": "quote",
                    "request_type": "subscribe",
                    "data": {
                        "symbols": [
                            {"symbol": "11536_NSE"},
                            {"symbol": "466029_MCX"}
                        ]
                    }
                }
            }
            
            await websocket.send(json.dumps(subscribe_msg) + "\n")
            print("[INFO] Subscription message sent.")
            
            while True:
                try:
                    print("[INFO] Waiting for data...")
                    data = await asyncio.wait_for(websocket.recv(), timeout=10)
                    
                    print(f"[DEBUG] Received data type: {type(data).__name__}, length: {len(data) if hasattr(data, '__len__') else 'N/A'}")
                    
                    if isinstance(data, bytes):
                        # Handle binary data
                        print("[DEBUG] Processing as binary data...")
                        decompress_and_decode(data)
                    elif isinstance(data, str):
                        # Handle base64 encoded compressed data
                        print("[DEBUG] Processing as string (likely base64)...")
                        try:
                            binary_data = base64.b64decode(data)
                            print(f"[DEBUG] Decoded base64 to {len(binary_data)} bytes")
                            decompress_and_decode(binary_data)
                        except Exception as e:
                            print(f"[WARNING] Error decoding base64: {e}")
                            print(f"[WARNING] Server response (text): {data[:100]}...")  # First 100 chars
                    else:
                        print(f"[WARNING] Server response (unknown type): {type(data)}")
                        
                except asyncio.TimeoutError:
                    print("[INFO] No data received in 10 seconds, continuing to wait...")
                except asyncio.CancelledError:
                    print("[INFO] WebSocket receive cancelled.")
                    break
                except Exception as e:
                    print(f"[ERROR] Error while receiving data: {e}")
                    import traceback
                    traceback.print_exc()
                    break
                    
    except websockets.exceptions.InvalidStatus as e:
        # InvalidStatus exception message contains the status code
        error_msg = str(e)
        status_code = "403"  # Default, will extract from message if possible
        if "403" in error_msg:
            status_code = "403"
        elif "401" in error_msg:
            status_code = "401"
        elif "404" in error_msg:
            status_code = "404"
        
        print(f"[ERROR] Failed to connect to WebSocket: HTTP {status_code}")
        print("[INFO] This usually means:")
        print("  - Access token has expired (check the token expiration)")
        print("  - Invalid credentials (token or API key)")
        print("  - Server rejected the connection")
        print(f"[DEBUG] Error message: {error_msg}")
    except Exception as e:
        print(f"[ERROR] Failed to connect to WebSocket: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    try:
        asyncio.run(connect_ws())
    except KeyboardInterrupt:
        print("[INFO] Program interrupted by user.")

