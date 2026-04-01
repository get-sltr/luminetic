import type { IpaMetadata } from "../ipa-parser";
import type { AnalyzerResult, StaticFinding } from "./types";
import { nextFindingId } from "./types";

const GUIDELINE_BASE = "https://developer.apple.com/app-store/review/guidelines";

const DEPRECATED_SDKS: Record<string, { guideline: string; reason: string }> = {
  UIWebView: { guideline: "2.5.6", reason: "UIWebView is deprecated and has been rejected since April 2020. Migrate to WKWebView." },
};

const SDKS_REQUIRING_PRIVACY_MANIFEST = new Set([
  "FirebaseAnalytics", "FirebaseCore", "GoogleAnalytics", "GoogleSignIn",
  "GoogleMobileAds", "FBSDKCoreKit", "FBSDKLoginKit", "FBSDKShareKit",
  "Amplitude", "Mixpanel", "Adjust", "Singular", "OneSignal", "Braze",
  "Sentry", "Crashlytics",
]);

export function analyzeSdks(metadata: IpaMetadata): AnalyzerResult {
  const findings: StaticFinding[] = [];

  // Deprecated/problematic SDKs
  for (const framework of metadata.frameworks) {
    const deprecated = DEPRECATED_SDKS[framework];
    if (deprecated) {
      findings.push({
        id: nextFindingId("SK"),
        severity: "CRITICAL",
        category: "sdk",
        title: `Deprecated SDK: ${framework}`,
        description: `${framework} is deprecated. ${deprecated.reason}`,
        guideline: deprecated.guideline,
        guideline_url: `${GUIDELINE_BASE}/#software-requirements`,
        evidence: `${framework} detected in embedded frameworks.`,
        remediation: deprecated.reason,
        confidence: 1.0,
      });
    }
  }

  // SDKs requiring privacy manifests
  for (const fw of metadata.frameworkDetails) {
    if (SDKS_REQUIRING_PRIVACY_MANIFEST.has(fw.name) && !fw.hasPrivacyManifest) {
      findings.push({
        id: nextFindingId("SK"),
        severity: "MAJOR",
        category: "sdk",
        title: `${fw.name} Missing Required Privacy Manifest`,
        description: `${fw.name} is on Apple's list of SDKs that must include a PrivacyInfo.xcprivacy file, but none was found in the framework bundle.`,
        guideline: "5.1.1",
        guideline_url: `${GUIDELINE_BASE}/#data-collection-and-storage`,
        evidence: `${fw.name}.framework detected without PrivacyInfo.xcprivacy.`,
        remediation: `Update ${fw.name} to the latest version which includes a privacy manifest, or add a PrivacyInfo.xcprivacy to the framework bundle.`,
        confidence: 1.0,
      });
    }
  }

  return { analyzer: "sdk", findings };
}
