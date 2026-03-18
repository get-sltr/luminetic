import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/cognito";
import { putUser, getUser } from "@/lib/db";
import { setAuthCookies } from "@/lib/auth";
import { z } from "zod";
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
    const parts = tokens.AccessToken.split(".");
    if (parts.length !== 3 || !parts[1]) {
      return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
    }
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    const userId = payload?.sub as string;
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
      credits = userRecord?.scan_credits ?? 0;
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
    return NextResponse.json({ error: "Incorrect email or password." }, { status });
  }
}
