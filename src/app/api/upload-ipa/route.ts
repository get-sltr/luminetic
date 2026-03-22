import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getUser } from "@/lib/db";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { uploadLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const BUCKET = process.env.S3_BUCKET;

/** Single PUT limit — adjust if you support larger IPAs */
const MAX_IPA_BYTES = 500 * 1024 * 1024;

const schema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().refine(
    (ct) =>
      ct === "application/octet-stream" ||
      ct === "application/zip" ||
      ct === "application/x-itunes-ipa" ||
      ct === "",
    { message: "Unsupported content type for .ipa upload" }
  ),
  size: z.number().optional(),
});

function isAwsLikeError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; Code?: string; $metadata?: unknown };
  return (
    e.name === "CredentialsProviderError" ||
    e.name === "InvalidIdentityToken" ||
    e.name === "NetworkingError" ||
    e.Code === "CredentialsError" ||
    typeof e.$metadata === "object"
  );
}

export async function POST(request: NextRequest) {
  try {
    if (!BUCKET) {
      console.error("[upload-ipa] S3_BUCKET is not configured");
      return NextResponse.json(
        {
          error: "Server storage is not configured. Set S3_BUCKET in the deployment environment.",
          code: "SERVER_CONFIG",
        },
        { status: 503 }
      );
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sign in required to upload.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const rl = uploadLimiter.check(user.userId);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: "Too many upload attempts. Please wait a few minutes and try again.",
          code: "RATE_LIMIT",
        },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    // Credit check before issuing presigned URL
    let userRecord;
    try {
      userRecord = await getUser(user.userId);
    } catch (dbErr) {
      console.error("[upload-ipa] DynamoDB getUser failed:", dbErr);
      return NextResponse.json(
        {
          error: "Could not load your account. Check DYNAMODB_TABLE and IAM permissions.",
          code: "DB_ERROR",
        },
        { status: 503 }
      );
    }
    const isFounder = userRecord?.plan === "founder" || userRecord?.role === "founder" || userRecord?.role === "admin";
    if (!isFounder) {
      const credits = (userRecord?.scanCredits as number) || 0;
      if (credits <= 0) {
        return NextResponse.json(
          { error: "No scan credits remaining. Purchase credits to upload.", code: "NO_CREDITS" },
          { status: 429 }
        );
      }
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body.", code: "INVALID_JSON" },
        { status: 400 }
      );
    }
    const { filename, contentType, size } = schema.parse(body);

    if (size != null && size > MAX_IPA_BYTES) {
      return NextResponse.json(
        {
          error: `File too large (max ${Math.round(MAX_IPA_BYTES / (1024 * 1024))} MB).`,
          code: "FILE_TOO_LARGE",
        },
        { status: 413 }
      );
    }

    const normalizedContentType =
      contentType === "" || contentType === "application/x-itunes-ipa"
        ? "application/octet-stream"
        : contentType;

    // Sanitize filename: keep only safe characters
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const s3Key = `ipa-uploads/${user.userId}/${Date.now()}-${safeName}`;

    let uploadUrl: string;
    try {
      uploadUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: s3Key,
          ContentType: normalizedContentType,
        }),
        { expiresIn: 600 } // 10 minutes
      );
    } catch (presignErr) {
      const msg = presignErr instanceof Error ? presignErr.message : String(presignErr);
      console.error("[upload-ipa] getSignedUrl failed:", presignErr);
      const credsIssue = isAwsLikeError(presignErr);
      return NextResponse.json(
        {
          error: credsIssue
            ? "AWS credentials are missing or invalid for this server. Attach an IAM role with s3:PutObject on the bucket, or set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY for the runtime."
            : "Could not create upload URL. Verify S3 bucket name, region (AWS_REGION), and s3:PutObject permission.",
          code: credsIssue ? "AWS_CREDENTIALS" : "PRESIGN_FAILED",
          ...(process.env.NODE_ENV !== "production" && { _debug: msg.substring(0, 400) }),
        },
        { status: credsIssue ? 503 : 500 }
      );
    }

    return NextResponse.json({
      uploadUrl,
      s3Key,
      /** Client must send this exact header on PUT or S3 returns 403 SignatureDoesNotMatch */
      contentType: normalizedContentType,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid upload request (filename or content type).", code: "INVALID_INPUT" },
        { status: 400 }
      );
    }
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[upload-ipa] Error:", msg);
    const isProd = process.env.NODE_ENV === "production";
    return NextResponse.json(
      {
        error:
          "Upload setup failed unexpectedly. Check server logs.",
        code: "INTERNAL",
        ...(!isProd && { _debug: msg.substring(0, 400) }),
      },
      { status: 500 }
    );
  }
}
