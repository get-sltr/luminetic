export type ScanPdfKind = "preflight" | "review-packet";

const SCAN_PDF_ENDPOINTS: Record<ScanPdfKind, { path: string; filenamePrefix: string }> = {
  preflight: { path: "/api/generate-preflight-pdf", filenamePrefix: "preflight" },
  "review-packet": { path: "/api/generate-review-pdf", filenamePrefix: "review-packet" },
};

/** POST target for a completed scan's PDF. The generators only accept JSON bodies. */
export function scanPdfRequest(kind: ScanPdfKind, scanId: string): { url: string; init: RequestInit } {
  return {
    url: SCAN_PDF_ENDPOINTS[kind].path,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ scanId }),
    },
  };
}

export function scanPdfFilename(kind: ScanPdfKind, scanId: string): string {
  return `${SCAN_PDF_ENDPOINTS[kind].filenamePrefix}-${scanId.slice(0, 8)}.pdf`;
}
