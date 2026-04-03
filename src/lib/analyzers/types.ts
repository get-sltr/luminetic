export type Severity = "CRITICAL" | "MAJOR" | "MEDIUM" | "MINOR";

export type FindingCategory =
  | "privacy"
  | "entitlements"
  | "sdk"
  | "build_config"
  | "code_signing"
  | "assets";

export interface StaticFinding {
  id: string;
  severity: Severity;
  category: FindingCategory;
  title: string;
  description: string;
  guideline: string;
  guideline_url: string;
  evidence: string;
  remediation: string;
  confidence: 1.0;
}

export interface AnalyzerResult {
  analyzer: string;
  findings: StaticFinding[];
}

export interface Layer1Output {
  layer: "static_analysis";
  findings: StaticFinding[];
  metadata: Layer1Metadata;
}

export interface Layer1Metadata {
  bundle_id: string | null;
  bundle_version: string | null;
  build_number: string | null;
  minimum_os: string | null;
  xcode_version: string | null;
  sdk_version: string | null;
  embedded_frameworks: string[];
  entitlements: string[];
  provisioning_type: string | null;
  privacy_manifest_present: boolean;
  framework_privacy_manifests: string[];
}

let findingCounter = 0;

export function resetFindingCounter(): void {
  findingCounter = 0;
}

export function nextFindingId(prefix: string): string {
  findingCounter++;
  return `${prefix}-${String(findingCounter).padStart(3, "0")}`;
}
