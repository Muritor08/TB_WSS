import pako from "pako";
import {
  DEFAULT_PKT_INFO,
  PKT_TYPE,
  QUOTE,
  PacketSpec,
} from "./binaryDefaultSpec";

function ab2str(buf: Uint8Array, offset: number, len: number) {
  return new TextDecoder()
    .decode(buf.slice(offset, offset + len))
    .replace(/\0/g, "")
    .trim();
}

export function decodeBinaryMessage(
  buffer: ArrayBuffer,
  emit: (msg: string) => void
) {
  let payload = new Uint8Array(buffer);

  // ✅ TradeBridge browser WSS sometimes sends compressed frames directly
  if (payload[0] === 0x78) {
    try {
      payload = pako.inflate(payload);
    } catch {
      // not compressed, ignore
    }
  }

  const view = new DataView(payload.buffer);

  // ✅ Correct packet structure
  const pktLen = view.getInt16(0, true);
  const pktType = view.getUint8(2); // ✅ FIXED OFFSET

  if (!(pktType in PKT_TYPE)) {
    emit(`⚠️ Unknown packet type: ${pktType}`);
    return;
  }

  if (PKT_TYPE[pktType] !== QUOTE) return;

  const pktSpec: PacketSpec | undefined =
    DEFAULT_PKT_INFO.PKT_SPEC[pktType];

  if (!pktSpec) {
    emit(`⚠️ No packet spec for type ${pktType}`);
    return;
  }

  let idx = 3;
  const decoded: Record<string, any> = {};

  while (idx < pktLen) {
    const fieldId = payload[idx++];
    const field = pktSpec[fieldId];
    if (!field) break;

    if (field.type === "string") {
      decoded[field.key] = ab2str(payload, idx, field.len);
    } else if (field.type === "int32") {
      decoded[field.key] = view.getInt32(idx, true) / 100;
    } else if (field.type === "int64") {
      decoded[field.key] = Number(view.getBigInt64(idx, true));
    }

    idx += field.len;
  }

  emit(`📊 Decoded Data: ${JSON.stringify(decoded)}`);
}
