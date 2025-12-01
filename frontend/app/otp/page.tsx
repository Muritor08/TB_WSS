"use client"

import OtpForm from "@/components/otp-form"

export default function OtpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl bg-background border border-secondary-darker shadow-2xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <span className="text-white font-bold text-lg">TB</span>
            </div>
          </div>

          {/* ✅ ALL LOGIC LIVES INSIDE THIS COMPONENT */}
          <OtpForm />
        </div>
      </div>
    </div>
  )
}
