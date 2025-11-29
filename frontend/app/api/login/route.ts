import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { baseUrl, apiKey, userId, password } = await req.json();

  try {
    const resp = await fetch(
      `${baseUrl}/auth-services/api/auth/v1/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "source": "SDK",
          "api-key": apiKey,
        },
        body: JSON.stringify({ userId, password }),
      }
    );

    const data = await resp.json();

    const success = data?.infoID === "0";
    const txnId = data?.data?.txnId || null;

    return NextResponse.json({
      success,
      txnId,
      message: data?.data?.message || data?.infoMsg || "Login failed",
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      txnId: null,
      message: error?.message || "Login API error",
    });
  }
}
