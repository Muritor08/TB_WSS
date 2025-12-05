import { DEFAULT_PKT_INFO, FieldSpec } from "./binaryDefaultSpec";

type AnyObject = Record<string, any>;

/**
 * Decode binary packet - handles packet header (length + type) and field decoding
 */
export function decodeBinaryMessage(
  buffer: ArrayBuffer,
  pktType: number | null,
  log: (msg: string) => void
) {
  const view = new DataView(buffer);
  
  // If pktType is provided, use it directly (for backward compatibility)
  // Otherwise, read from packet header
  let actualPktType: number;
  let offset: number;
  let pktLen: number;
  
  if (pktType !== null && buffer.byteLength >= 3) {
    // Check if buffer has packet header (length + type)
    const headerLen = view.getInt16(0, true); // little-endian
    const headerType = view.getInt8(2);
    
    // If header type matches expected or is a valid packet type, use header
    if (headerType === pktType || (headerType in DEFAULT_PKT_INFO.PKT_SPEC)) {
      pktLen = headerLen;
      actualPktType = headerType;
      offset = 3; // Skip header
    } else {
      // No header, use provided type
      actualPktType = pktType;
      offset = 0;
      pktLen = buffer.byteLength;
    }
  } else if (buffer.byteLength >= 3) {
    // Read packet header
    pktLen = view.getInt16(0, true); // little-endian
    actualPktType = view.getInt8(2);
    offset = 3; // Skip header
  } else {
    return;
  }

  const pktSpec = DEFAULT_PKT_INFO.PKT_SPEC[actualPktType];

  if (!pktSpec) {
    // Try packet type 49 as fallback
    if (49 in DEFAULT_PKT_INFO.PKT_SPEC) {
      return decodeL1PKT(view, offset, pktLen, DEFAULT_PKT_INFO.PKT_SPEC[49], log);
    }
    return;
  }

  decodeL1PKT(view, offset, pktLen, pktSpec, log);
}

function decodeL1PKT(
  view: DataView,
  startOffset: number,
  pktLen: number,
  pktSpec: { [fieldId: number]: FieldSpec },
  log: (msg: string) => void
) {
  const decoded: AnyObject = {};
  let precision = 2;
  let offset = startOffset;
  const maxLen = Math.min(pktLen, view.byteLength);

  while (offset < maxLen) {
    // Read field ID (1 byte)
    const fieldId = view.getUint8(offset);
    offset += 1;

    const field: FieldSpec | undefined = pktSpec[fieldId];

    // Stop on unknown field
    if (!field) {
      break;
    }

    // Check bounds
    if (offset + field.len > view.byteLength) {
      break;
    }

    try {
      const value = readField(view, offset, field);
      
      // Handle precision field
      if (field.key === "precision") {
        precision = value as number;
      } else if (field.key !== "precision") {
        // Apply formatting if available
        if (field.fmt) {
          decoded[field.key] = field.fmt(value as number, precision);
        } else {
          decoded[field.key] = value;
        }
      }

      offset += field.len;
    } catch (err: any) {
      break;
    }
  }

  // Emit decoded data in Python dictionary format
  if (Object.keys(decoded).length > 0) {
    // Format as Python dictionary string
    const dictString = Object.entries(decoded)
      .map(([key, value]) => `'${key}': '${value}'`)
      .join(', ');
    log(`Decoded Data: {${dictString}}`);
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

    case "float":
      // ✅ Double precision float (little-endian)
      return view.getFloat64(offset, true);

    case "uint8":
      return view.getUint8(offset);

    default:
      return null;
  }
}

function readInt64(view: DataView, offset: number): number {
  const low = view.getUint32(offset, true);
  const high = view.getInt32(offset + 4, true);
  return high * 2 ** 32 + low;
}
