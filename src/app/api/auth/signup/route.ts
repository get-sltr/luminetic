import { NextRequest, NextResponse } from "next/server";
import { signUp } from "@/lib/cognito";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = schema.parse(body);

    await signUp(email, password);

    return NextResponse.json({ success: true, message: "Verification email sent." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email or password format." }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Signup failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
