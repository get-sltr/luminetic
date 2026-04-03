import type { IpaMetadata } from "../ipa-parser";
import type { AnalyzerResult, StaticFinding } from "./types";
import { nextFindingId } from "./types";

const GUIDELINE_BASE = "https://developer.apple.com/app-store/review/guidelines";

export function analyzeCodeSigning(metadata: IpaMetadata): AnalyzerResult {
  const findings: StaticFinding[] = [];

  // Development provisioning profile
  if (metadata.provisioningType === "development") {
    findings.push({
      id: nextFindingId("CS"),
      severity: "CRITICAL",
      category: "code_signing",
      title: "Development Provisioning Profile (Not App Store Distribution)",
      description: "This IPA is signed with a development provisioning profile. Apple will reject this build. You must archive with an App Store distribution profile.",
      guideline: "2.1",
      guideline_url: `${GUIDELINE_BASE}/#performance`,
      evidence: `Provisioning profile type detected as "development" (get-task-allow = true with provisioned devices).`,
      remediation: "In Xcode, archive your app and select 'App Store Connect' distribution method, or use 'Release Testing' to generate a properly signed IPA.",
      confidence: 1.0,
    });
  }

  // Ad-hoc provisioning profile
  if (metadata.provisioningType === "ad-hoc") {
    findings.push({
      id: nextFindingId("CS"),
      severity: "CRITICAL",
      category: "code_signing",
      title: "Ad-Hoc Provisioning Profile (Not App Store Distribution)",
      description: "This IPA is signed with an ad-hoc provisioning profile. Apple will reject this build. You must archive with an App Store distribution profile.",
      guideline: "2.1",
      guideline_url: `${GUIDELINE_BASE}/#performance`,
      evidence: `Provisioning profile type detected as "ad-hoc" (provisioned devices list present, get-task-allow = false).`,
      remediation: "In Xcode, archive your app and select 'App Store Connect' distribution method instead of ad-hoc.",
      confidence: 1.0,
    });
  }

  // Expired provisioning profile
  if (metadata.provisioningExpiry) {
    try {
      const expiryDate = new Date(metadata.provisioningExpiry);
      if (expiryDate < new Date()) {
        findings.push({
          id: nextFindingId("CS"),
          severity: "CRITICAL",
          category: "code_signing",
          title: "Expired Provisioning Profile",
          description: `The provisioning profile expired on ${expiryDate.toISOString().split("T")[0]}. Apple will reject builds with expired profiles.`,
          guideline: "2.1",
          guideline_url: `${GUIDELINE_BASE}/#performance`,
          evidence: `Provisioning profile ExpirationDate = ${metadata.provisioningExpiry}.`,
          remediation: "Regenerate your provisioning profile in the Apple Developer portal and re-archive your app.",
          confidence: 1.0,
        });
      }
    } catch { /* invalid date format, skip */ }
  }

  return { analyzer: "code_signing", findings };
}
