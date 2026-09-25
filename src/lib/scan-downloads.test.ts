import { describe, expect, it } from "vitest";
import { scanPdfFilename, scanPdfRequest } from "./scan-downloads";

describe("scanPdfRequest", () => {
  it("posts the scan id to the preflight generator", () => {
    const { url, init } = scanPdfRequest("preflight", "abcdef1234567890");
    expect(url).toBe("/api/generate-preflight-pdf");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ scanId: "abcdef1234567890" });
  });

  it("posts the scan id to the review-packet generator", () => {
    const { url, init } = scanPdfRequest("review-packet", "abcdef1234567890");
    expect(url).toBe("/api/generate-review-pdf");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ scanId: "abcdef1234567890" });
  });

  it("does not target the unimplemented /api/pdf GET paths", () => {
    expect(scanPdfRequest("preflight", "scan-1").url).not.toContain("/api/pdf/");
    expect(scanPdfRequest("review-packet", "scan-1").url).not.toContain("/api/pdf/");
  });
});

describe("scanPdfFilename", () => {
  it("uses the generator filename prefix and a short scan id", () => {
    expect(scanPdfFilename("preflight", "abcdef1234567890")).toBe("preflight-abcdef12.pdf");
    expect(scanPdfFilename("review-packet", "abcdef1234567890")).toBe("review-packet-abcdef12.pdf");
  });
});
