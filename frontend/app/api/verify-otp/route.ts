import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { baseUrl, apiKey, userId, txnId, otp } = await req.json();

  try {
    const resp = await fetch(
      `https://${baseUrl}.arihantplus.com/auth-services/api/auth/v1/verify-otp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "source": "SDK",
          "api-key": apiKey,
        },
        body: JSON.stringify({ userId, txnId, otp }),
      }
    );

    const data = await resp.json();

    const accessToken = data?.data?.accessToken || null;

    const success =
      data?.infoID === "0" &&
      typeof accessToken === "string";

    return NextResponse.json({
      success,
      accessToken,
      message: data?.infoMsg || "OTP verification failed",
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      accessToken: null,
      message: error?.message || "Verify OTP API error",
    });
  }
}
