import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { getAuthUser } from "@/lib/auth";
import { getScan } from "@/lib/db";
import { analyzeLimiter } from "@/lib/rate-limit";

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

    const reviewPacket = (mergedResult.review_packet || {}) as Record<string, unknown>;
    const ipaMetadata = mergedResult.ipa_metadata as Record<string, unknown> | null;

    const appName = (ipaMetadata?.appName as string) || "Unknown App";
    const bundleId = (ipaMetadata?.bundleId as string) || "N/A";
    const version = (ipaMetadata?.version as string) || "N/A";
    const dateStr = new Date(scan.createdAt as string).toLocaleDateString(
      "en-US",
      { month: "long", day: "numeric", year: "numeric" }
    );

    const testingSteps = (reviewPacket.testing_steps as string[]) || [];
    const reviewerNotes = (reviewPacket.reviewer_notes as string) || "";
    const knownLimitations = (reviewPacket.known_limitations as string[]) || [];

    // ── Generate PDF ───────────────────────────────────────────
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    function checkPageBreak(needed: number) {
      if (y + needed > pageHeight - 60) {
        doc.addPage();
        y = margin;
      }
    }

    // Header
    doc.setFont("courier", "bold");
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text("LUMINETIC REVIEW PACKET", margin, y);
    y += 8;
    doc.setDrawColor(180, 80, 200);
    doc.setLineWidth(1.5);
    doc.line(margin, y, margin + contentWidth, y);
    y += 28;

    // App info
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

    // ── Testing Steps ──────────────────────────────────────────
    drawSectionHeader(doc, "TESTING STEPS", margin, y, contentWidth);
    y += 25;

    if (testingSteps.length > 0) {
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);

      for (let i = 0; i < testingSteps.length; i++) {
        checkPageBreak(30);
        const stepNum = `${(i + 1).toString().padStart(2, " ")}.`;
        const stepLines = doc.splitTextToSize(
          `${stepNum} ${testingSteps[i]}`,
          contentWidth
        );
        for (const sl of stepLines) {
          checkPageBreak(14);
          doc.text(sl, margin, y);
          y += 14;
        }
        y += 4;
      }
    } else {
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.setTextColor(140, 140, 140);
      doc.text("No testing steps generated for this scan.", margin, y);
      y += 16;
    }
    y += 10;

    // ── Reviewer Notes ─────────────────────────────────────────
    checkPageBreak(50);
    drawSectionHeader(doc, "REVIEWER NOTES", margin, y, contentWidth);
    y += 25;

    if (reviewerNotes) {
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const noteLines = doc.splitTextToSize(reviewerNotes, contentWidth);
      for (const nl of noteLines) {
        checkPageBreak(14);
        doc.text(nl, margin, y);
        y += 14;
      }
    } else {
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.setTextColor(140, 140, 140);
      doc.text("No reviewer notes generated for this scan.", margin, y);
      y += 16;
    }
    y += 15;

    // ── Known Limitations ──────────────────────────────────────
    checkPageBreak(50);
    drawSectionHeader(doc, "KNOWN LIMITATIONS", margin, y, contentWidth);
    y += 25;

    if (knownLimitations.length > 0) {
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);

      for (const limitation of knownLimitations) {
        checkPageBreak(30);
        const limLines = doc.splitTextToSize(`- ${limitation}`, contentWidth);
        for (const ll of limLines) {
          checkPageBreak(14);
          doc.text(ll, margin, y);
          y += 14;
        }
        y += 4;
      }
    } else {
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.setTextColor(140, 140, 140);
      doc.text("No known limitations identified.", margin, y);
      y += 16;
    }
    y += 15;

    // ── Demo Credentials ───────────────────────────────────────
    checkPageBreak(80);
    drawSectionHeader(doc, "DEMO CREDENTIALS", margin, y, contentWidth);
    y += 25;

    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.setTextColor(140, 140, 140);
    doc.text("Email:     ______________________________", margin, y);
    y += 18;
    doc.text("Password:  ______________________________", margin, y);
    y += 14;
    doc.setFontSize(8);
    doc.text("(Fill in before submitting to App Store Connect)", margin, y);
    y += 30;

    // ── Footer ─────────────────────────────────────────────────
    // Apply footer to all pages
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setDrawColor(180, 80, 200);
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 40, margin + contentWidth, pageHeight - 40);
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text("Generated by Luminetic", margin, pageHeight - 28);
      doc.text("luminetic.io", pageWidth - margin - 60, pageHeight - 28);
      if (totalPages > 1) {
        doc.text(
          `Page ${p} of ${totalPages}`,
          pageWidth / 2 - 25,
          pageHeight - 28
        );
      }
    }

    // Output
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="review-packet-${scanId.slice(0, 8)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("generate-review-pdf error:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

function drawSectionHeader(
  doc: jsPDF,
  title: string,
  x: number,
  y: number,
  width: number
) {
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(x, y, x + width, y);
  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text(title, x, y + 16);
}
