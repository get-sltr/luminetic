import { NextRequest, NextResponse } from "next/server";
import { confirmSignUp } from "@/lib/cognito";
import { z } from "zod";
import { authLimiter, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6),
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
    const { email, code } = schema.parse(body);

    await confirmSignUp(email, code);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    const raw = error instanceof Error ? error.message : "";
    let message = "Verification failed. Please try again.";
    if (raw.includes("CodeMismatchException") || raw.includes("code")) {
      message = "Invalid verification code. Please check and try again.";
    } else if (raw.includes("ExpiredCodeException") || raw.includes("expired")) {
      message = "Verification code has expired. Please request a new one.";
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
