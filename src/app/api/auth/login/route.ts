import { NextRequest, NextResponse } from "next/server";
import { signIn, getUser as getCognitoUser } from "@/lib/cognito";
import { putUser, getUser } from "@/lib/db";
import { setAuthCookies } from "@/lib/auth";
import { z } from "zod";
import { authLimiter, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  // Do not enforce length at login: existing users may have older valid passwords.
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = authLimiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  let body: { email: string; password: string };
  try {
    const raw = await request.text();
    body = schema.parse(JSON.parse(raw));
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const result = await signIn(body.email, body.password);
    const tokens = result.AuthenticationResult;

    if (!tokens?.AccessToken || !tokens?.RefreshToken) {
      return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
    }

    // Get userId from Cognito instead of JWT parsing
    const cognitoUser = await getCognitoUser(tokens.AccessToken);
    const userId = cognitoUser.Username;
    if (!userId) {
      return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
    }

    // Ensure user record exists in DynamoDB
    try {
      await putUser(userId, body.email);
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
    const message = error instanceof Error ? error.message : "Login failed.";
    const status = message.includes("NotAuthorized") || message.includes("Incorrect") ? 401 : 400;
    console.error("[login] Auth error:", message);
    return NextResponse.json({ error: "Incorrect email or password." }, { status });
  }
}
