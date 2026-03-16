import { NextRequest, NextResponse } from "next/server";
import { signUp } from "@/lib/cognito";
import { z } from "zod";
import { authLimiter, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
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

    await signUp(email, password);

    return NextResponse.json({ success: true, message: "Verification email sent." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email or password format." }, { status: 400 });
    }
    const raw = error instanceof Error ? error.message : "";
    // Map Cognito errors to user-friendly messages without leaking internals
    let message = "Signup failed. Please try again.";
    if (raw.includes("UsernameExistsException") || raw.includes("already exists")) {
      message = "An account with this email already exists.";
    } else if (raw.includes("InvalidPasswordException") || raw.includes("password")) {
      message = "Password does not meet requirements. Use 12+ characters with uppercase, lowercase, number, and symbol.";
    } else if (raw.includes("InvalidParameterException")) {
      message = "Invalid email or password format.";
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
