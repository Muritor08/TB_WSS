"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2, CheckCircle2, Pause, Play, LogOut } from "lucide-react"
import { decodeBinaryMessage } from "@/lib/decodeBinary"
import { inflateBase64ToBuffer } from "@/lib/inflateBinary"
import pako from "pako"

export default function OtpForm() {
  const router = useRouter()
  const [otp, setOtp] = useState("")
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [connected, setConnected] = useState(false)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false) // Use ref to track paused state in WebSocket handler
  const wsRef = useRef<WebSocket | null>(null)
  const waitTimer = useRef<NodeJS.Timeout | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const addLog = (msg: string) => {
    console.log(msg) // Also log to browser console
    setLogs((p) => [...p.slice(-300), msg])
  }

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [logs])

  // Auto-reconnect on page load/refresh if token exists
  useEffect(() => {
    const wsTokenRaw = sessionStorage.getItem("wsToken")
    if (wsTokenRaw) {
      try {
        const tokenData = JSON.parse(wsTokenRaw)
        const { baseUrl, apiKey, accessToken, timestamp } = tokenData
        
        // Check if token is not too old (e.g., less than 24 hours)
        const tokenAge = Date.now() - (timestamp || 0)
        const maxAge = 24 * 60 * 60 * 1000 // 24 hours
        
        if (tokenAge < maxAge && baseUrl && apiKey && accessToken) {
          addLog("🔄 Reconnecting to WebSocket...")
          // Use setTimeout to avoid dependency issues
          setTimeout(() => {
            startBrowserSocket(baseUrl, accessToken, apiKey)
          }, 100)
        } else {
          // Token expired, clear it
          sessionStorage.removeItem("wsToken")
          addLog("⚠️ Stored token expired, please verify OTP again")
        }
      } catch (err) {
        console.error("Error parsing stored token:", err)
        sessionStorage.removeItem("wsToken")
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  const resetWaitTimer = () => {
    if (waitTimer.current) clearTimeout(waitTimer.current)
    waitTimer.current = setTimeout(() => {
      addLog("⏳ No data received in 10 seconds, continuing to wait...")
      addLog("📥 Waiting for data...")
      resetWaitTimer()
    }, 10000)
  }

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const authRaw = sessionStorage.getItem("authData")
    if (!authRaw || !otp.trim()) {
      setError("Please enter the OTP code")
      return
    }

    setLoading(true)
    const { baseUrl, apiKey, userId, txnId } = JSON.parse(authRaw)

    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, apiKey, userId, txnId, otp }),
      })

      const data = await res.json()

      if (!data.success || !data.accessToken) {
        setError("❌ OTP verification failed")
        addLog("❌ OTP verification failed")
        return
      }

      addLog("✅ OTP Verified Successfully")
      
      // Store access token for auto-reconnect on refresh
      const tokenData = {
        baseUrl,
        apiKey,
        accessToken: data.accessToken,
        timestamp: Date.now()
      }
      sessionStorage.setItem("wsToken", JSON.stringify(tokenData))
      
      startBrowserSocket(baseUrl, data.accessToken, apiKey)
    } catch (err: any) {
      const errorMsg = err?.message || "OTP verification error"
      setError(errorMsg)
      addLog("❌ " + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const startBrowserSocket = (baseUrl: string, token: string, apiKey: string) => {
    if (wsRef.current) wsRef.current.close()

    const ws = new WebSocket(`wss://${baseUrl}.arihantplus.com/market-stream?token=${token}&apikey=${apiKey}`)

    ws.binaryType = "arraybuffer"
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      addLog(`✅ Connected to ${baseUrl} WebSocket`)

      const subMsg = {
        request: {
          streaming_type: "quote",
          request_type: "subscribe",
          data: {
            symbols: [{ "symbol": "2885_NSE" }, { "symbol": "466029_MCX" }]
          },
        },
      }

      ws.send(JSON.stringify(subMsg) + "\n")
      addLog("📨 Subscription message sent")
      resetWaitTimer()
    }

    ws.onmessage = (event) => {
      resetWaitTimer()

      // If paused, skip processing but keep connection alive
      // Use ref to get current paused state (closure-safe)
      if (pausedRef.current) {
        return
      }

      try {
        let buffer: ArrayBuffer

        // ✅ Case 1: Raw binary frame
        if (event.data instanceof ArrayBuffer) {
          buffer = event.data
        }
        // ✅ Case 2: Base64 + compressed frame
        else if (typeof event.data === "string") {
          try {
            // Try base64 decode first
            buffer = inflateBase64ToBuffer(event.data)
          } catch (err: any) {
            // Maybe it's already binary, try to decode as-is
            const binary = atob(event.data)
            const bytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i)
            }
            buffer = bytes.buffer
          }
        }
        // ✅ Fallback
        else {
          return
        }

        // Check for compression header (first 5 bytes: algo at offset 4)
        if (buffer.byteLength >= 5) {
          const view = new DataView(buffer)
          const algo = view.getInt8(4)
          
          if (algo === 10) {
            // Zlib compression - decompress
            try {
              const compressed = new Uint8Array(buffer, 5) // Skip first 5 bytes
              const decompressed = pako.inflate(compressed)
              buffer = decompressed.buffer
            } catch (err: any) {
              // Try decoding raw data after header
              buffer = buffer.slice(5)
            }
          } else {
            // No compression, skip header
            buffer = buffer.slice(5)
          }
        }

        // Decode the packet (only shows "Decoded Data: {...}")
        if (buffer.byteLength >= 3) {
          decodeBinaryMessage(buffer, null, addLog)
        }
      } catch (err: any) {
        // Silent error handling - only log critical errors
        console.error("Decode error:", err)
      }
    }





    ws.onerror = () => {
      setConnected(false)
      addLog("❌ WebSocket error occurred")
    }

    ws.onclose = () => {
      setConnected(false)
      addLog("🛑 WebSocket connection closed")
      if (waitTimer.current) clearTimeout(waitTimer.current)
      
      // Auto-reconnect after 2 seconds if token exists
      const wsTokenRaw = sessionStorage.getItem("wsToken")
      if (wsTokenRaw) {
        try {
          const tokenData = JSON.parse(wsTokenRaw)
          const { baseUrl, apiKey, accessToken } = tokenData
          if (baseUrl && apiKey && accessToken) {
            setTimeout(() => {
              addLog("🔄 Attempting to reconnect...")
              startBrowserSocket(baseUrl, accessToken, apiKey)
            }, 2000)
          }
        } catch (err) {
          console.error("Error reconnecting:", err)
        }
      }
    }
  }

  useEffect(() => {
    return () => {
      wsRef.current?.close()
      if (waitTimer.current) clearTimeout(waitTimer.current)
    }
  }, [])

  return (
    <div className="h-full flex flex-col">
      {!connected ? (
        // OTP Form - shown when not connected
        <div className="flex items-center justify-center flex-1 p-4">
          <div className="w-full max-w-md space-y-6">
            <div className="flex items-center justify-center mb-6">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                <span className="text-white font-bold text-lg">TB</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground text-center">Verify OTP</h1>
              <p className="text-muted-foreground text-center">Enter the one-time password to access the market stream</p>
            </div>

            <form onSubmit={verifyOtp} className="space-y-4">
              {error && (
                <div className="flex items-center gap-3 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="otp" className="text-sm font-medium text-foreground">
                  One-Time Password
                </label>
                <input
                  id="otp"
                  type="text"
                  placeholder="Enter 4-digit OTP/6-digit TOTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={loading || connected}
                  maxLength={6}
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-secondary-darker text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-center text-lg tracking-widest"
                />
              </div>

              <button
                type="submit"
                disabled={loading || connected}
                className="w-full py-2.5 px-4 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify OTP"
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        // Full-page Event Logs - shown when connected
        <div className="h-full flex flex-col">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 bg-background border-b border-secondary-darker">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                <span className="text-white font-bold">TB</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Market Data Stream</h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`h-2 w-2 rounded-full ${paused ? "bg-yellow-500" : "bg-green-500"} ${paused ? "" : "animate-pulse"}`} />
                  <span className="text-sm text-muted-foreground">
                    {paused ? "Paused" : "Connected"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Pause/Resume Button */}
              <button
                onClick={() => {
                  const newPausedState = !pausedRef.current
                  pausedRef.current = newPausedState
                  setPaused(newPausedState)
                  
                  if (newPausedState) {
                    addLog("⏸️ Feed paused - Click Resume to continue")
                  } else {
                    addLog("▶️ Feed resumed - Receiving data...")
                  }
                }}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
                  paused
                    ? "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20"
                    : "bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20"
                }`}
              >
                {paused ? (
                  <>
                    <Play className="h-4 w-4" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause
                  </>
                )}
              </button>
              
              {/* Logout Button */}
              <button
                onClick={() => {
                  // Close WebSocket connection
                  wsRef.current?.close()
                  
                  // Clear all session data
                  sessionStorage.removeItem("wsToken")
                  sessionStorage.removeItem("authData")
                  
                  // Reset state
                  setConnected(false)
                  pausedRef.current = false
                  setPaused(false)
                  setLogs([])
                  
                  // Navigate back to login page
                  router.push("/")
                }}
                className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>

          {/* Full-page Event Logs */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            <div className="bg-secondary-darker px-6 py-3 border-b border-secondary-darker">
              <h3 className="text-sm font-semibold text-foreground">Event Logs</h3>
            </div>
            <pre className="flex-1 overflow-auto p-6 text-sm font-mono bg-background text-foreground">
              {logs.length ? logs.join("\n") : "Logs will appear here..."}
              <div ref={logsEndRef} />
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
