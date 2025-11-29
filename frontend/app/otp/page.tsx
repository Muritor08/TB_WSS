"use client";

import { useEffect, useState } from "react";
import { decodeBinaryMessage } from "@/lib/decodeBinary";

export default function OtpPage() {
  const [otp, setOtp] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const apiKey = sessionStorage.getItem("apiKey") || "";

  const addLog = (msg: string) =>
    setLogs((p) => [...p.slice(-200), msg]);

  const verifyOtp = async () => {
    const res = await fetch("/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        otp,
      }),
    });

    const data = await res.json();

    if (!data.accessToken) {
      addLog("❌ OTP verification failed");
      return;
    }

    setAccessToken(data.accessToken);
    addLog("✅ OTP Verified");

    startBrowserSocket(data.accessToken);
  };

  const startBrowserSocket = (token: string) => {
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

    socket.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) {
        decodeBinaryMessage(e.data, addLog);
        addLog("📥 Waiting for data...");
      } else {
        addLog(String(e.data));
      }
    };

    socket.onerror = () => addLog("❌ WebSocket error");
    socket.onclose = () => addLog("🛑 WebSocket closed");

    setWs(socket);
  };

  useEffect(() => () => ws?.close(), [ws]);

  return (
    <div style={{ padding: 30 }}>
      <h2>OTP Verification</h2>

      <input
        placeholder="OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
      />
      <button onClick={verifyOtp}>Verify OTP</button>

      <pre
        style={{
          marginTop: 20,
          height: 350,
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
  );
}
