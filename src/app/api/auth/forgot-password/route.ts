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

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }

    const err = error as { name?: string; message?: string };
    const name = err.name ?? "";
    const msg = err.message ?? String(error);
    console.error("[forgot-password] Cognito error:", name, msg);

    // Same response as success so callers can't probe which emails exist
    if (name === "UserNotFoundException" || msg.includes("UserNotFoundException")) {
      return NextResponse.json({ success: true });
    }

    if (name === "LimitExceededException" || msg.includes("LimitExceededException")) {
      return NextResponse.json({ error: "Too many reset attempts. Try again later." }, { status: 429 });
    }
    if (name === "TooManyRequestsException" || msg.includes("TooManyRequestsException")) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }
    if (name === "CodeDeliveryFailureException" || msg.includes("CodeDeliveryFailureException")) {
      return NextResponse.json(
        {
          error:
            "We couldn't send the email. Ask your admin to check Cognito email (SES) settings, or try again later.",
        },
        { status: 503 }
      );
    }
    if (name === "InvalidParameterException" || msg.includes("InvalidParameterException")) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    if (name === "NotAuthorizedException" || msg.includes("NotAuthorizedException")) {
      return NextResponse.json(
        {
          error:
            "This account can't reset its password yet (e.g. email not verified). Try signing up again or contact support.",
        },
        { status: 400 }
      );
    }
    if (msg.includes("COGNITO_CLIENT_ID")) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Unable to send reset email right now. Please try again in a few minutes." },
      { status: 503 }
    );
  }
}
