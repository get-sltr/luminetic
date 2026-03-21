import { NextRequest, NextResponse } from "next/server";
import { forgotPassword } from "@/lib/cognito";
import { z } from "zod";
import { authLimiter, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
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
    const { email } = schema.parse(body);

    await forgotPassword(email);

    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }
    // Still return success to prevent email enumeration
    return NextResponse.json({ success: true });
  }
}
