"use client"

import LoginForm from "@/components/login-form"

export default function LoginPage() {
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
