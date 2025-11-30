"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [baseUrl, setBaseUrl] = useState("tradebridge");
  const [apiKey, setApiKey] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!baseUrl || !apiKey || !userId || !password) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl,
          apiKey,
          userId,
          password,
        }),
      });

      const data = await res.json();

      console.log("LOGIN RESPONSE:", data); // ✅ DEBUG (keep once)

      // ✅ ONLY correct success condition
      if (data.success === true && typeof data.txnId === "string") {
        const authData = {
          baseUrl,
          apiKey,
          userId,
          txnId: data.txnId,
        };

        // ✅ WRITE FIRST
        sessionStorage.setItem("authData", JSON.stringify(authData));

        // ✅ THEN NAVIGATE
        router.push("/otp");
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err: any) {
      alert(err?.message || "Login error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Login</h2>

      <div>
        <input
          placeholder="Base URL"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          style={{ width: 400 }}
        />
      </div>

      <div>
        <input
          placeholder="API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{ width: 400 }}
        />
      </div>

      <div>
        <input
          placeholder="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
      </div>

      <div>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <br />

      <button onClick={login} disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>
    </div>
  );
}
