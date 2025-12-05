"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import LoginForm from "@/components/login-form"

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    // If user is already authenticated (has token), redirect to OTP page
    if (typeof window !== "undefined") {
      const wsToken = sessionStorage.getItem("wsToken")
      if (wsToken) {
        try {
          const tokenData = JSON.parse(wsToken)
          const tokenAge = Date.now() - (tokenData.timestamp || 0)
          const maxAge = 24 * 60 * 60 * 1000 // 24 hours
          
          if (tokenAge < maxAge && tokenData.accessToken) {
            router.push("/otp")
          }
        } catch (err) {
          // Invalid token, stay on login page
        }
      }
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-background border border-secondary-darker shadow-2xl p-8 space-y-6">
          <div className="flex items-center justify-center mb-4">
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
