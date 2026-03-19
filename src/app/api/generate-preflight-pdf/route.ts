import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { getAuthUser } from "@/lib/auth";
import { getScan } from "@/lib/db";
import { analyzeLimiter } from "@/lib/rate-limit";

interface PreflightCheck {
  status: "pass" | "fail" | "warning" | "unknown";
  detail: string;
}

const STATUS_LABEL: Record<string, string> = {
  pass: "PASS",
  fail: "FAIL",
  warning: "WARN",
  unknown: "N/A",
};

const PREFLIGHT_LABELS: Record<string, string> = {
  privacy_policy: "Privacy Policy URL",
  account_deletion: "Account Deletion",
  export_compliance: "Export Compliance",
  att_prompt: "App Tracking Transparency",
  iap_storekit: "In-App Purchases (StoreKit)",
  restore_purchases: "Restore Purchases",
  age_rating: "Age Rating Accuracy",
  crash_free: "Crash-Free Stability",
  permissions_justified: "Permission Purpose Strings",
  screenshots_accurate: "Screenshots Match UI",
  privacy_labels: "Privacy Nutrition Labels",
  data_deletion: "Data Deletion Support",
};

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateCheck = analyzeLimiter.check(user.userId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rateCheck.retryAfterMs },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { scanId } = body;

    if (!scanId || typeof scanId !== "string") {
      return NextResponse.json(
        { error: "scanId is required" },
        { status: 400 }
      );
    }

    const scan = await getScan(user.userId, scanId);
    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const mergedResult = scan.mergedResult as Record<string, unknown> | undefined;
    if (!mergedResult) {
      return NextResponse.json(
        { error: "Scan has no analysis results" },
        { status: 400 }
      );
    }

    const preflight = (mergedResult.preflight || {}) as Record<string, PreflightCheck>;
    const ipaMetadata = mergedResult.ipa_metadata as Record<string, unknown> | null;
    const assessment = mergedResult.assessment as Record<string, unknown> | null;

    const appName = (ipaMetadata?.appName as string) || "Unknown App";
    const bundleId = (ipaMetadata?.bundleId as string) || "N/A";
    const version = (ipaMetadata?.version as string) || "N/A";
    const score = (assessment?.score as number) ?? 0;
    const dateStr = new Date(scan.createdAt as string).toLocaleDateString(
      "en-US",
      { month: "long", day: "numeric", year: "numeric" }
    );

    // ── Generate PDF ───────────────────────────────────────────
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // Header
    doc.setFont("courier", "bold");
    doc.setFontSize(18);
    doc.text("LUMINETIC PRE-FLIGHT CHECKLIST", margin, y);
    y += 8;
    doc.setDrawColor(180, 80, 200);
    doc.setLineWidth(1.5);
    doc.line(margin, y, margin + contentWidth, y);
    y += 28;

    // App info block
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);

    const infoLines = [
      `App:        ${appName}`,
      `Bundle ID:  ${bundleId}`,
      `Version:    ${version}`,
      `Date:       ${dateStr}`,
    ];
    for (const line of infoLines) {
      doc.text(line, margin, y);
      y += 15;
    }
    y += 10;

    // Separator
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentWidth, y);
    y += 20;

    // Preflight checks
    doc.setFont("courier", "bold");
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text("CHECKS", margin, y);
    y += 20;

    const entries = Object.entries(preflight);
    let passCount = 0;
    let failCount = 0;
    let warnCount = 0;

    for (const [key, check] of entries) {
      // Check for page overflow
      if (y > doc.internal.pageSize.getHeight() - 80) {
        doc.addPage();
        y = margin;
      }

      const label = PREFLIGHT_LABELS[key] || formatKey(key);
      const status = check.status || "unknown";
      const statusText = STATUS_LABEL[status] || "N/A";
      const detail = check.detail || "";

      if (status === "pass") passCount++;
      else if (status === "fail") failCount++;
      else if (status === "warning") warnCount++;

      // Status indicator
      doc.setFont("courier", "bold");
      doc.setFontSize(10);

      if (status === "pass") doc.setTextColor(34, 160, 100);
      else if (status === "fail") doc.setTextColor(220, 60, 60);
      else if (status === "warning") doc.setTextColor(210, 160, 30);
      else doc.setTextColor(140, 140, 140);

      doc.text(`[${statusText}]`, margin, y);

      // Label
      doc.setTextColor(40, 40, 40);
      doc.setFont("courier", "bold");
      doc.text(label, margin + 55, y);
      y += 14;

      // Detail
      if (detail) {
        doc.setFont("courier", "normal");
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        const detailLines = doc.splitTextToSize(detail, contentWidth - 55);
        for (const dLine of detailLines) {
          if (y > doc.internal.pageSize.getHeight() - 60) {
            doc.addPage();
            y = margin;
          }
          doc.text(dLine, margin + 55, y);
          y += 12;
        }
      }

      y += 8;
    }

    // If no preflight checks exist
    if (entries.length === 0) {
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.setTextColor(140, 140, 140);
      doc.text("No preflight checks available for this scan.", margin, y);
      y += 20;
    }

    // Score section
    if (y > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      y = margin;
    }

    y += 10;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentWidth, y);
    y += 25;

    doc.setFont("courier", "bold");
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text("SUMMARY", margin, y);
    y += 20;

    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Passed: ${passCount}   Failed: ${failCount}   Warnings: ${warnCount}`, margin, y);
    y += 18;
    doc.text(`Overall Readiness Score: ${score}/100`, margin, y);
    y += 30;

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(180, 80, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 40, margin + contentWidth, pageHeight - 40);
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text("Generated by Luminetic", margin, pageHeight - 28);
    doc.text("luminetic.io", pageWidth - margin - 60, pageHeight - 28);

    // Output
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="preflight-${scanId.slice(0, 8)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("generate-preflight-pdf error:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
