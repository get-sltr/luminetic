import { NextRequest, NextResponse } from "next/server";
import { signOut } from "@/lib/cognito";
import { clearAuthCookies } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (accessToken) {
    try {
      await signOut(accessToken);
    } catch {
      // Token may already be expired — still clear cookies
    }
  }

  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return response;
}
