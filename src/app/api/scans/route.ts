import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getScans, getScan } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const url = new URL(request.url);

  // Poll a single scan by ID (used by analyze page to track progress)
  const scanId = url.searchParams.get("scanId");
  if (scanId) {
    const scan = await getScan(user.userId, scanId);
    if (!scan) return NextResponse.json({ error: "Scan not found." }, { status: 404 });
    return NextResponse.json({
      scanId: scan.scanId,
      status: scan.status,
      score: scan.score,
      mergedResult: scan.status === "complete" ? scan.mergedResult : undefined,
      errorMessage: scan.errorMessage,
      updatedAt: scan.updatedAt,
    });
  }

  // List all scans
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 50);
  const scans = await getScans(user.userId, limit);
  return NextResponse.json({ success: true, data: scans });
}
