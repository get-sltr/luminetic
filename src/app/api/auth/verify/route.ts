import { NextRequest, NextResponse } from "next/server";
import { confirmSignUp } from "@/lib/cognito";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = schema.parse(body);

    await confirmSignUp(email, code);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Verification failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
