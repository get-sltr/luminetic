import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const BUCKET = process.env.S3_BUCKET!;

export async function uploadTestZip(
  zipBuffer: Uint8Array,
  userId: string,
  scanId: string
): Promise<{ s3Key: string; downloadUrl: string; expiresAt: string }> {
  const s3Key = `tests/${userId}/${scanId}/${Date.now()}-test-suite.zip`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: zipBuffer,
      ContentType: "application/zip",
      ContentDisposition: "attachment; filename=luminetic-test-suite.zip",
    })
  );

  const downloadUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }),
    { expiresIn: 86400 } // 24 hours
  );

  const expiresAt = new Date(Date.now() + 86400 * 1000).toISOString();

  return { s3Key, downloadUrl, expiresAt };
}
