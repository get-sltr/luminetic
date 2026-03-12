import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/cognito";
import { putUser } from "@/lib/db";
import { setAuthCookies } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
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

    const response = NextResponse.json({ success: true });
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
