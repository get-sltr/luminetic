import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { canUserScan } from "@/lib/db";

/** Lightweight endpoint for the client to check if the user can scan. */
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  const authUser = accessToken ? await verifyToken(accessToken) : null;
  if (!authUser) {
    return NextResponse.json({ allowed: false, reason: "Not authenticated." }, { status: 401 });
  }

  try {
    const gate = await canUserScan(authUser.userId);
    return NextResponse.json({
      allowed: gate.allowed,
      reason: gate.reason,
      credits: gate.credits,
      scanCount: gate.scanCount,
    });
  } catch {
    return NextResponse.json({ allowed: false, reason: "Unable to check scan status." }, { status: 503 });
  }
}
