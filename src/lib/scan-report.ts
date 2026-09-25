export interface ScanReportShape {
  guidelines: unknown[];
  issues: unknown[];
  action_plan: unknown[];
  assessment: {
    score: number;
    confidence?: string;
    summary?: string;
    agreement_level?: string;
    risk_factors?: string[];
  };
  meta?: {
    total_latency_ms?: number;
    models_used?: string[];
  };
}

/** True when a stored scan has the fields the report view dereferences. */
export function isRenderableScanReport(result: unknown): result is ScanReportShape {
  if (!result || typeof result !== "object") return false;
  const report = result as Record<string, unknown>;
  const assessment = report.assessment;
  if (!assessment || typeof assessment !== "object") return false;
  return (
    Array.isArray(report.guidelines) &&
    Array.isArray(report.issues) &&
    Array.isArray(report.action_plan) &&
    typeof (assessment as { score?: unknown }).score === "number"
  );
}
