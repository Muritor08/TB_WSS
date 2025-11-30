"use client"

import { useEffect, useRef, useState } from "react"
import { decodeBinaryMessage } from "@/lib/decodeBinary"
import OtpForm from "@/components/otp-form"

export default function OtpPage() {
  const [otp, setOtp] = useState("")
  const [logs, setLogs] = useState<string[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const waitTimer = useRef<NodeJS.Timeout | null>(null)

  const addLog = (msg: string) => {
    setLogs((p) => [...p.slice(-300), msg])
  }

  // ✅ Restart wait timer (Python asyncio.wait_for equivalent)
  const resetWaitTimer = () => {
    if (waitTimer.current) clearTimeout(waitTimer.current)

    waitTimer.current = setTimeout(() => {
      addLog("⏳ No data received in 10 seconds, continuing to wait...")
      addLog("📥 Waiting for data...")
      resetWaitTimer()
    }, 10000)
  }

  // ✅ OTP verification → start socket
  const verifyOtp = async (otpValue: string) => {
    setOtp(otpValue)
    const authRaw = sessionStorage.getItem("authData")
    if (!authRaw || !otpValue) return

    const { baseUrl, apiKey, userId, txnId } = JSON.parse(authRaw)

    const res = await fetch("/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseUrl, apiKey, userId, txnId, otp: otpValue }),
    })

    const data = await res.json()

    if (!data.success || !data.accessToken) {
      addLog("❌ OTP verification failed")
      return
    }

    addLog("✅ OTP Verified")
    startBrowserSocket(baseUrl, data.accessToken, apiKey)
  }

  // ✅ PURE BROWSER SOCKET (CLIENT IP)
  const startBrowserSocket = (baseUrl: string, token: string, apiKey: string) => {
    if (wsRef.current) wsRef.current.close()

    const ws = new WebSocket(`wss://${baseUrl}.arihantplus.com/market-stream?token=${token}&apikey=${apiKey}`)

    ws.binaryType = "arraybuffer"
    wsRef.current = ws

    ws.onopen = () => {
      addLog("✅ Connected to TradeBridge WebSocket")

      const subMsg = {
        request: {
          streaming_type: "quote",
          request_type: "subscribe",
          data: { symbols: [{ symbol: "2885_NSE" }] },
        },
      }

      ws.send(JSON.stringify(subMsg) + "\n")
      addLog("📨 Subscription message sent.")
      addLog("📥 Waiting for data...")
      resetWaitTimer()
    }

    ws.onmessage = (event) => {
      resetWaitTimer()

      if (event.data instanceof ArrayBuffer) {
        decodeBinaryMessage(event.data, addLog)
        addLog("📥 Waiting for data...")
      } else {
        addLog("⚠️ Server response (non-binary): " + String(event.data))
      }
    }

    ws.onerror = () => {
      addLog("❌ WebSocket error")
    }

    ws.onclose = () => {
      addLog("🛑 WebSocket receive cancelled.")
      if (waitTimer.current) clearTimeout(waitTimer.current)
    }
  }

  // ✅ Cleanup on page unload
  useEffect(() => {
    return () => {
      wsRef.current?.close()
      if (waitTimer.current) clearTimeout(waitTimer.current)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl bg-background border border-secondary-darker shadow-2xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <span className="text-white font-bold text-lg">TB</span>
            </div>
          </div>

          <OtpForm/>
        </div>
      </div>
      <pre
        style={{
          marginTop: 20,
          height: 380,
          overflow: "auto",
          background: "#000",
          color: "#0f0",
          padding: 10,
          fontSize: 13,
        }}
      >
        {logs.length ? logs.join("\n") : "No logs yet..."}
      </pre>
    </div>
  )
}
