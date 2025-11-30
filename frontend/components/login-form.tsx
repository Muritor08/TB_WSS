"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2 } from "lucide-react"

export default function LoginForm() {
  const router = useRouter()
  const [baseUrl, setBaseUrl] = useState("tradebridge")
  const [apiKey, setApiKey] = useState("")
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!baseUrl || !apiKey || !userId || !password) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)

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
      })

      const data = await res.json()

      if (data.success === true && typeof data.txnId === "string") {
        const authData = {
          baseUrl,
          apiKey,
          userId,
          txnId: data.txnId,
        }

        sessionStorage.setItem("authData", JSON.stringify(authData))
        router.push("/otp")
      } else {
        setError(data.message || "Login failed. Please try again.")
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred during login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="w-full max-w-md space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Welcome</h1>
        <p className="text-muted-foreground">Enter your credentials to access TradeBridge WSS</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="baseUrl" className="text-sm font-medium text-foreground">
            Enter Subdomain of the Environment
          </label>
          <input
            id="baseUrl"
            type="text"
            placeholder="e.g., tradebridge"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-secondary-darker text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="apiKey" className="text-sm font-medium text-foreground">
            Market Feed API Key
          </label>
          <input
            id="apiKey"
            type="password"
            placeholder="Enter your Market Feed API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-secondary-darker text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="userId" className="text-sm font-medium text-foreground">
            Client Code
          </label>
          <input
            id="userId"
            type="text"
            placeholder="Enter your Client Code"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-secondary-darker text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-secondary-darker text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Logging in...
          </>
        ) : (
          "Login"
        )}
      </button>
    </form>
  )
}
