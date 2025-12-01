import pako from "pako"

export function inflateBase64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  // ✅ ZLIB inflate
  return pako.inflate(bytes).buffer
}
