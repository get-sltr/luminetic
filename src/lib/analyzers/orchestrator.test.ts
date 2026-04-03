import { describe, it, expect } from "vitest";
import { runStaticAnalysis } from "./orchestrator";
import type { IpaMetadata } from "../ipa-parser";

function makeMetadata(overrides: Partial<IpaMetadata> = {}): IpaMetadata {
  return {
    bundleId: "com.test.app", appName: "Test App", version: "1.0", buildNumber: "1",
    minimumOSVersion: "16.0", exportCompliance: false, supportsIndirectInputEvents: null,
    privacyUsageDescriptions: {}, requiredDeviceCapabilities: [], backgroundModes: [],
    urlSchemes: [], urlTypes: [], queriesSchemes: [], entitlements: {}, frameworks: [],
    xcodeVersion: null, xcodeBuild: null, sdkName: null, sdkBuild: null,
    platformVersion: null, atsConfig: null, sceneManifest: null, launchStoryboard: "LaunchScreen",
    privacyManifest: null, frameworkDetails: [], provisioningType: "app-store", teamId: "ABCDEF1234",
    provisioningExpiry: null,
    ...overrides,
  };
}

describe("Static Analysis Orchestrator", () => {
  it("runs all analyzers and returns Layer1Output", () => {
    const meta = makeMetadata({
      frameworks: ["AVFoundation"],
      frameworkDetails: [{ name: "AVFoundation", hasPrivacyManifest: false, bundleId: null, version: null }],
    });
    const result = runStaticAnalysis(meta);
    expect(result.layer).toBe("static_analysis");
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings[0]!.confidence).toBe(1.0);
    expect(result.metadata.bundle_id).toBe("com.test.app");
  });

  it("sorts findings by severity (CRITICAL first)", () => {
    const meta = makeMetadata({
      frameworks: ["AVFoundation"],
      frameworkDetails: [{ name: "AVFoundation", hasPrivacyManifest: false, bundleId: null, version: null }],
      atsConfig: { NSAllowsArbitraryLoads: true }, // MAJOR
    });
    const result = runStaticAnalysis(meta);
    const severities = result.findings.map(f => f.severity);
    const criticalIdx = severities.indexOf("CRITICAL");
    const majorIdx = severities.indexOf("MAJOR");
    if (criticalIdx !== -1 && majorIdx !== -1) {
      expect(criticalIdx).toBeLessThan(majorIdx);
    }
  });

  it("returns empty findings for a clean app", () => {
    const meta = makeMetadata();
    const result = runStaticAnalysis(meta);
    expect(result.findings).toHaveLength(0);
  });

  it("populates metadata correctly", () => {
    const meta = makeMetadata({
      privacyManifest: { NSPrivacyTracking: false },
      frameworkDetails: [
        { name: "Sentry", hasPrivacyManifest: true, bundleId: "io.sentry", version: "8.0" },
      ],
      frameworks: ["Sentry"],
    });
    const result = runStaticAnalysis(meta);
    expect(result.metadata.privacy_manifest_present).toBe(true);
    expect(result.metadata.framework_privacy_manifests).toContain("Sentry");
  });
});
