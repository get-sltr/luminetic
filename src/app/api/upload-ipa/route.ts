import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getUser } from "@/lib/db";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { checkoutLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const BUCKET = process.env.S3_BUCKET!;

const schema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().refine(
    (ct) => ct === "application/octet-stream" || ct === "application/zip",
    { message: "Content type must be application/octet-stream or application/zip" }
  ),
  size: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Rate limit by userId (reuse checkout limiter: 5 per 10 min)
    const rl = checkoutLimiter.check(user.userId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many upload attempts. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    // Credit check before issuing presigned URL
    const userRecord = await getUser(user.userId);
    const isFounder = userRecord?.plan === "founder" || userRecord?.role === "founder" || userRecord?.role === "admin";
    if (!isFounder) {
      const credits = (userRecord?.scanCredits as number) || 0;
      if (credits <= 0) {
        return NextResponse.json({ error: "No scan credits remaining." }, { status: 429 });
      }
    }

    const body = await request.json();
    const { filename, contentType } = schema.parse(body);

    // Sanitize filename: keep only safe characters
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const s3Key = `ipa-uploads/${user.userId}/${Date.now()}-${safeName}`;

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        ContentType: contentType,
      }),
      { expiresIn: 600 } // 10 minutes
    );

    return NextResponse.json({ uploadUrl, s3Key });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    console.error("[upload-ipa] Error:", error);
    return NextResponse.json(
      { error: "Upload setup failed. Please try again." },
      { status: 500 }
    );
  }
}
