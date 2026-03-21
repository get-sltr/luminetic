import { NextRequest, NextResponse } from "next/server";
import { confirmForgotPassword } from "@/lib/cognito";
import { z } from "zod";
import { authLimiter, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
  password: z.string().min(8),
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

  try {
    const body = await request.json();
    const { email, code, password } = schema.parse(body);

    await confirmForgotPassword(email, code, password);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "";
    if (message.includes("CodeMismatch") || message.includes("ExpiredCode")) {
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
    }
    return NextResponse.json({ error: "Password reset failed. Please try again." }, { status: 400 });
  }
}
