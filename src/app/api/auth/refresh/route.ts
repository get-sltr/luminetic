import { NextRequest, NextResponse } from "next/server";
import { refreshSession } from "@/lib/cognito";

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();
    if (!refreshToken) return NextResponse.json({ error: "No refresh token." }, { status: 400 });

    const result = await refreshSession(refreshToken);
    const accessToken = result.AuthenticationResult?.AccessToken;

    if (!accessToken) return NextResponse.json({ error: "Refresh failed." }, { status: 401 });

    return NextResponse.json({ accessToken });
  } catch {
    return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
  }
}
