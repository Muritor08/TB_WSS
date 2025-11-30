import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { baseUrl, apiKey, userId, txnId } = await req.json();

  try {
    const resp = await fetch(
      `https://${baseUrl}.arihantplus.com/auth-services/api/auth/v1/resend-otp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "source": "SDK",
          "api-key": apiKey,
        },
        body: JSON.stringify({ userId, txnId }),
      }
    );

    const data = await resp.json();

    return NextResponse.json({
      success: data?.infoID === "0",
      txnId: data?.data?.txnId || txnId,
      message: data?.data?.message || data?.infoMsg || "OTP resent",
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      txnId,
      message: error?.message || "Resend OTP API error",
    });
  }
}
