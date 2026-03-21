import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/cognito";
import { putUser, getUser } from "@/lib/db";
import { setAuthCookies } from "@/lib/auth";
import { z } from "zod";
import { decodeJwt } from "jose";
import { authLimiter, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = getClientIp(request);
  const rl = authLimiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  try {
    const body = await request.json();
    const { email, password } = schema.parse(body);

    const result = await signIn(email, password);
    const tokens = result.AuthenticationResult;

    if (!tokens?.AccessToken || !tokens?.RefreshToken) {
      return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
    }

    // Decode sub from access token
    let userId: string;
    try {
      const payload = decodeJwt(tokens.AccessToken);
      userId = payload?.sub as string;
    } catch (e) {
      console.error("[login] JWT decode failed:", e);
      return NextResponse.json({ error: "Authentication failed.", _step: "jwt", _msg: String(e) }, { status: 500 });
    }
    if (!userId) {
      return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
    }

    // Ensure user record exists in DynamoDB
    try {
      await putUser(userId, email);
    } catch {
      // Already exists — that's fine
    }

    // Check credits to determine redirect
    let credits = 0;
    try {
      const userRecord = await getUser(userId);
      credits = userRecord?.scanCredits ?? 0;
    } catch {
      // Default to 0 credits
    }

    const response = NextResponse.json({ success: true, credits });
    setAuthCookies(response, tokens.AccessToken, tokens.RefreshToken);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Login failed.";
    const status = message.includes("NotAuthorized") || message.includes("Incorrect") ? 401 : 400;
    console.error("[login] Auth error:", message);
    return NextResponse.json({ error: "Incorrect email or password." }, { status });
  }
}
