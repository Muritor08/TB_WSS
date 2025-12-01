import { DEFAULT_PKT_INFO, FieldSpec } from "./binaryDefaultSpec";

type AnyObject = Record<string, any>;

/**
 * Decode binary packet using spec-driven decoding
 * pktType must be passed explicitly (e.g. 1 for QUOTE)
 */
export function decodeBinaryMessage(
  buffer: ArrayBuffer,
  pktType: number,
  log: (msg: string) => void
) {
  const view = new DataView(buffer);
  const pktSpec = DEFAULT_PKT_INFO.PKT_SPEC[pktType];

  if (!pktSpec) {
    log(`❌ Unknown packet spec for pktType: ${pktType}`);
    return;
  }

  let offset = 0;
  const decoded: AnyObject = {};

  while (offset < buffer.byteLength) {
    // ✅ Field ID (1 byte)
    const fieldId = view.getUint8(offset);
    offset += 1;

    const field: FieldSpec | undefined = pktSpec[fieldId];

    // ✅ Same behavior as Python: stop on unknown field
    if (!field) {
      break;
    }

    decoded[field.key] = readField(view, offset, field);
    offset += field.len;
  }

  // ✅ Emit logs (same pattern you are using everywhere)
  for (const [key, value] of Object.entries(decoded)) {
    log(`${key}: ${value}`);
  }
}

function readField(
  view: DataView,
  offset: number,
  field: FieldSpec
) {
  switch (field.type) {
    case "string": {
      const bytes = new Uint8Array(view.buffer, offset, field.len);
      return new TextDecoder()
        .decode(bytes)
        .replace(/\0/g, "")
        .trim();
    }

    case "int32":
      // ✅ little-endian
      return view.getInt32(offset, true);

    case "int64":
      // ✅ Safe int64 handling (Number)
      return readInt64(view, offset);

    default:
      return null;
  }
}

function readInt64(view: DataView, offset: number): number {
  const low = view.getUint32(offset, true);
  const high = view.getInt32(offset + 4, true);
  return high * 2 ** 32 + low;
}
