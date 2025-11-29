"use client";

import { useEffect, useState } from "react";

type AuthData = {
  baseUrl: string;
  apiKey: string;
  userId: string;
  txnId: string;
};

type ToastType = "success" | "error" | "info";

// ✅ Backend URL from ENV (REQUIRED FOR PUBLIC HOSTING)
const BACKEND_HTTP = process.env.NEXT_PUBLIC_BACKEND_URL!;
const BACKEND_WS = BACKEND_HTTP.replace(/^http/, "ws");

export default function OtpPage() {
  const [otp, setOtp] = useState("");
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [toast, setToast] = useState<{ type: ToastType; msg: string } | null>(
    null
  );

  // ✅ Load auth data
  useEffect(() => {
    const stored = sessionStorage.getItem("authData");
    if (!stored) {
      window.location.href = "/";
      return;
    }
    setAuth(JSON.parse(stored));
  }, []);

  // ✅ Logs WebSocket (PUBLIC SAFE)
  useEffect(() => {
    if (!BACKEND_WS) return;

    const ws = new WebSocket(`${BACKEND_WS}/logs`);

    ws.onmessage = (event) => {
      setLogs((prev) => [...prev.slice(-200), event.data]);
    };

    ws.onerror = () => {
      setToast({ type: "error", msg: "Log connection error" });
    };

    return () => ws.close();
  }, []);

  // ✅ Auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ✅ Verify OTP
  const verifyOtp = async () => {
    if (!auth || !otp) return;

    const res = await fetch("/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: auth.baseUrl,
        apiKey: auth.apiKey,
        userId: auth.userId,
        txnId: auth.txnId,
        otp,
      }),
    });

    const data = await res.json();

    if (data.success && data.accessToken) {
      setAccessToken(data.accessToken);
      sessionStorage.setItem("accessToken", data.accessToken);

      setToast({ type: "success", msg: "OTP Verified" });

      // ✅ AUTO START SOCKET
      startSocket(data.accessToken);
    } else {
      setToast({
        type: "error",
        msg: data.message || "OTP verification failed",
      });
    }
  };

  // ✅ Resend OTP
  const resendOtp = async () => {
    if (!auth) return;

    const res = await fetch("/api/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(auth),
    });

    const data = await res.json();

    if (data.success && data.txnId) {
      const updatedAuth = { ...auth, txnId: data.txnId };
      setAuth(updatedAuth);
      sessionStorage.setItem("authData", JSON.stringify(updatedAuth));
      setToast({ type: "info", msg: "OTP Resent" });
    } else {
      setToast({ type: "error", msg: "Failed to resend OTP" });
    }
  };

  // ✅ Start socket (PUBLIC SAFE)
  const startSocket = async (token: string) => {
    if (!auth) return;

    await fetch(`${BACKEND_HTTP}/start-socket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: auth.baseUrl,
        apiKey: auth.apiKey,
        accessToken: token,
      }),
    });
  };

  return (
    <div style={{ padding: 35, fontFamily: "sans-serif" }}>
      <h2>OTP Verification</h2>

      {/* ✅ TOAST MESSAGE */}
      {toast && (
        <div
          style={{
            marginBottom: 15,
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

      {/* OTP INPUT */}
      <input
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter OTP"
        style={{ padding: 6, marginRight: 10 }}
      />

      <button onClick={verifyOtp}>Verify OTP</button>
      &nbsp;
      <button onClick={resendOtp}>Resend OTP</button>

      {/* LIVE LOGS */}
      {accessToken && (
        <>
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
        </>
      )}
    </div>
  );
}
