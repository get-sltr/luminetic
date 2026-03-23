import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    cognito_pool: process.env.COGNITO_USER_POOL_ID ? "set" : "MISSING",
    cognito_client: process.env.COGNITO_CLIENT_ID ? "set" : "MISSING",
    dynamodb: process.env.DYNAMODB_TABLE ? "set" : "MISSING",
    s3: process.env.S3_BUCKET ? "set" : "MISSING",
    square: process.env.SQUARE_ACCESS_TOKEN ? "set" : "MISSING",
    gemini_api_key_env: process.env.GEMINI_API_KEY ? "set" : "MISSING",
    region: process.env.AWS_REGION || "NOT SET",
  });
}
