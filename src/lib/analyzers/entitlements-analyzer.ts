import type { IpaMetadata } from "../ipa-parser";
import type { AnalyzerResult, StaticFinding } from "./types";
import { nextFindingId } from "./types";

const GUIDELINE_BASE = "https://developer.apple.com/app-store/review/guidelines";

const VALID_ASSOCIATED_DOMAIN_PREFIXES = [
  "applinks:", "webcredentials:", "activitycontinuation:", "appclips:",
];

export function analyzeEntitlements(metadata: IpaMetadata): AnalyzerResult {
  const findings: StaticFinding[] = [];

  // HealthKit entitlement without healthkit in UIRequiredDeviceCapabilities
  if (metadata.entitlements["com.apple.developer.healthkit"] === true) {
    if (!metadata.requiredDeviceCapabilities.includes("healthkit")) {
      findings.push({
        id: nextFindingId("EN"),
        severity: "CRITICAL",
        category: "entitlements",
        title: "HealthKit Entitlement Without Device Capability Declaration",
        description: "App has com.apple.developer.healthkit entitlement but 'healthkit' is not listed in UIRequiredDeviceCapabilities. Apple requires this for HealthKit apps.",
        guideline: "27.1",
        guideline_url: `${GUIDELINE_BASE}/#healthkit`,
        evidence: "com.apple.developer.healthkit = true in entitlements. 'healthkit' not found in UIRequiredDeviceCapabilities.",
        remediation: "Add 'healthkit' to the UIRequiredDeviceCapabilities array in Info.plist.",
        confidence: 1.0,
      });
    }
  }

  // Push notifications: remote-notification background mode without aps-environment
  if (metadata.backgroundModes.includes("remote-notification")) {
    if (!metadata.entitlements["aps-environment"]) {
      findings.push({
        id: nextFindingId("EN"),
        severity: "CRITICAL",
        category: "entitlements",
        title: "Push Notification Background Mode Without APS Entitlement",
        description: "App declares 'remote-notification' background mode but does not have the 'aps-environment' entitlement. Push notifications will not work.",
        guideline: "4.0",
        guideline_url: `${GUIDELINE_BASE}/#design`,
        evidence: "'remote-notification' found in UIBackgroundModes. 'aps-environment' not found in entitlements.",
        remediation: "Enable Push Notifications capability in Xcode to add the aps-environment entitlement to your provisioning profile.",
        confidence: 1.0,
      });
    }
  }

  // Associated domains format validation
  const associatedDomains = metadata.entitlements["com.apple.developer.associated-domains"];
  if (Array.isArray(associatedDomains)) {
    for (const domain of associatedDomains) {
      if (typeof domain !== "string") continue;
      const hasValidPrefix = VALID_ASSOCIATED_DOMAIN_PREFIXES.some(p => domain.startsWith(p));
      if (!hasValidPrefix) {
        findings.push({
          id: nextFindingId("EN"),
          severity: "MAJOR",
          category: "entitlements",
          title: "Invalid Associated Domain Format",
          description: `Associated domain entry "${domain}" does not start with a valid prefix (applinks:, webcredentials:, activitycontinuation:, appclips:).`,
          guideline: "2.1",
          guideline_url: `${GUIDELINE_BASE}/#performance`,
          evidence: `"${domain}" found in com.apple.developer.associated-domains without a valid prefix.`,
          remediation: `Fix the associated domain entry to use the correct format, e.g. "applinks:example.com".`,
          confidence: 1.0,
        });
      }
    }
  }

  // iCloud containers: entitlement exists but array is empty
  const icloudContainers = metadata.entitlements["com.apple.developer.icloud-container-identifiers"];
  if (Array.isArray(icloudContainers) && icloudContainers.length === 0) {
    findings.push({
      id: nextFindingId("EN"),
      severity: "MAJOR",
      category: "entitlements",
      title: "iCloud Entitlement With Empty Container List",
      description: "App has iCloud container identifiers entitlement but the array is empty. iCloud functionality will not work.",
      guideline: "2.23",
      guideline_url: `${GUIDELINE_BASE}/#performance`,
      evidence: "com.apple.developer.icloud-container-identifiers is an empty array in entitlements.",
      remediation: "Add your iCloud container identifier to the array, or remove the iCloud entitlement if not needed.",
      confidence: 1.0,
    });
  }

  return { analyzer: "entitlements", findings };
}
