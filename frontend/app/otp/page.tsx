"use client";

import { useEffect, useState } from "react";
import { decodeBinaryMessage } from "@/lib/decodeBinary";

type ToastType = "success" | "error" | "info";

export default function OtpPage() {
  const [otp, setOtp] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [toast, setToast] = useState<{ type: ToastType; msg: string } | null>(
    null
  );
  const [ws, setWs] = useState<WebSocket | null>(null);

  const addLog = (msg: string) =>
    setLogs((p) => [...p.slice(-200), msg]);

  // ✅ Auto-hide toaster
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // ✅ Verify OTP → Start browser socket (NO backend call)
  const verifyOtp = async () => {
    if (!otp) return;

    const authRaw = sessionStorage.getItem("authData");
    if (!authRaw) return;

    const { baseUrl, apiKey, userId, txnId } = JSON.parse(authRaw);

    const res = await fetch("/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl,
        apiKey,
        userId,
        txnId,
        otp,
      }),
    });

    const data = await res.json();

    if (!data.success || !data.accessToken) {
      setToast({ type: "error", msg: "OTP verification failed" });
      return;
    }

    setToast({ type: "success", msg: "OTP Verified" });
    sessionStorage.setItem("accessToken", data.accessToken);

    startBrowserSocket(data.accessToken, apiKey);
  };

  // ✅ PURE BROWSER WEBSOCKET (CLIENT IP)
  const startBrowserSocket = (token: string, apiKey: string) => {
    if (ws) ws.close();

    const socket = new WebSocket(
      `wss://tradebridge.arihantplus.com/market-stream?token=${token}&apikey=${apiKey}`
    );

    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
      addLog("✅ Connected to TradeBridge WebSocket");

      socket.send(
        JSON.stringify({
          request: {
            streaming_type: "quote",
            request_type: "subscribe",
            data: { symbols: [{ symbol: "2885_NSE" }] },
          },
        }) + "\n"
      );

      addLog("📨 Subscription message sent.");
      addLog("📥 Waiting for data...");
    };

    socket.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        decodeBinaryMessage(event.data, addLog);
        addLog("📥 Waiting for data...");
      } else {
        addLog(String(event.data));
      }
    };

    socket.onerror = () => addLog("❌ WebSocket error");
    socket.onclose = () => addLog("🛑 WebSocket closed");

    setWs(socket);
  };

  // ✅ Cleanup
  useEffect(() => {
    return () => {
      ws?.close();
    };
  }, [ws]);

  return (
    <div style={{ padding: 35, fontFamily: "sans-serif" }}>
      <h2>OTP Verification</h2>

      {toast && (
        <div
          style={{
            marginBottom: 14,
            padding: "8px 14px",
            borderRadius: 4,
            color: "#fff",
            background:
              toast.type === "success"
                ? "#2e7d32"
                : toast.type === "error"
                ? "#c62828"
                : "#0277bd",
          }}
        >
          {toast.msg}
        </div>
      )}

      <input
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter OTP"
        style={{ padding: 6, marginRight: 10 }}
      />

      <button onClick={verifyOtp}>Verify OTP</button>

      <hr style={{ margin: "20px 0" }} />

      <h3>Live TradeBridge Logs</h3>

      <div
        style={{
          height: 350,
          overflowY: "auto",
          background: "#000",
          color: "#0f0",
          padding: 10,
          fontFamily: "monospace",
          fontSize: 13,
          border: "1px solid #333",
        }}
      >
        {logs.length === 0 && <div>No logs yet...</div>}
        {logs.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}
