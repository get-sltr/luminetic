import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { parseIpa } from "@/lib/ipa-parser";
import { analyzeLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  s3Key: z
    .string()
    .min(1)
    .refine((key) => key.startsWith("ipa-uploads/"), {
      message: "Invalid S3 key: must be in ipa-uploads/",
    }),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Rate limit by userId (reuse analyze limiter: 20 per hour)
    const rl = analyzeLimiter.check(user.userId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many parse requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const body = await request.json();
    const { s3Key } = schema.parse(body);

    // Ensure the user can only parse their own uploads — block path traversal
    if (s3Key.includes("..") || !s3Key.startsWith(`ipa-uploads/${user.userId}/`)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { metadata } = await parseIpa(s3Key);

    return NextResponse.json({ metadata });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    console.error("[parse-ipa] Error:", error);
    return NextResponse.json(
      { error: "IPA parsing failed. Ensure the file is a valid .ipa archive." },
      { status: 500 }
    );
  }
}
