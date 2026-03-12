import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getScan } from "@/lib/db";
import { generateTests } from "@/lib/test-gen/generator";
import { uploadTestZip } from "@/lib/test-gen/s3";
import { AnalysisIssue } from "@/lib/test-gen/types";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const db = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" })
);
const TABLE = process.env.DYNAMODB_TABLE || "appready";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { scanId, includeDetox = false, appId } = body as {
      scanId: string;
      includeDetox?: boolean;
      appId?: string;
    };

    if (!scanId || typeof scanId !== "string") {
      return NextResponse.json({ error: "scanId is required." }, { status: 400 });
    }

    // Fetch scan
    const scan = await getScan(user.userId, scanId);
    if (!scan) {
      return NextResponse.json({ error: "Scan not found." }, { status: 404 });
    }

    const mergedResult = scan.mergedResult as Record<string, unknown> | undefined;
    const issues = (mergedResult?.issues as AnalysisIssue[]) || [];

    if (issues.length === 0) {
      return NextResponse.json(
        { error: "No issues found in this scan. Nothing to test." },
        { status: 400 }
      );
    }

    // Generate tests
    const { tests, zipBuffer } = await generateTests(issues, {
      includeDetox,
      appId: appId || undefined,
    });

    // Upload to S3
    const { s3Key, downloadUrl, expiresAt } = await uploadTestZip(
      zipBuffer,
      user.userId,
      scanId
    );

    // Update scan record with test suite info
    try {
      await db.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { PK: `USER#${user.userId}`, SK: scan.SK as string },
          UpdateExpression:
            "SET testSuiteUrl = :url, testSuiteS3Key = :key, testSuiteExpiresAt = :exp, testCount = :cnt",
          ExpressionAttributeValues: {
            ":url": downloadUrl,
            ":key": s3Key,
            ":exp": expiresAt,
            ":cnt": tests.length,
          },
        })
      );
    } catch (err) {
      console.error("[generate-tests] Failed to update scan record:", err);
    }

    return NextResponse.json({
      success: true,
      downloadUrl,
      expiresAt,
      testCount: tests.length,
      tests: tests.map((t) => ({
        filename: t.filename,
        category: t.category,
        format: t.format,
        issueDescription: t.issueDescription,
      })),
    });
  } catch (error) {
    console.error("[generate-tests] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Test generation failed.",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.stack
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}
