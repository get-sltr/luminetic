import { describe, it, expect, beforeEach } from "vitest";
import { analyzeEntitlements } from "./entitlements-analyzer";
import { resetFindingCounter } from "./types";
import type { IpaMetadata } from "../ipa-parser";

function makeMetadata(overrides: Partial<IpaMetadata> = {}): IpaMetadata {
  return {
    bundleId: "com.test.app", appName: "Test App", version: "1.0", buildNumber: "1",
    minimumOSVersion: "16.0", exportCompliance: null, supportsIndirectInputEvents: null,
    privacyUsageDescriptions: {}, requiredDeviceCapabilities: [], backgroundModes: [],
    urlSchemes: [], urlTypes: [], queriesSchemes: [], entitlements: {}, frameworks: [],
    xcodeVersion: null, xcodeBuild: null, sdkName: null, sdkBuild: null,
    platformVersion: null, atsConfig: null, sceneManifest: null, launchStoryboard: null,
    privacyManifest: null, frameworkDetails: [], provisioningType: null, teamId: null,
    provisioningExpiry: null,
    ...overrides,
  };
}

describe("Entitlements Analyzer", () => {
  beforeEach(() => resetFindingCounter());

  it("flags HealthKit entitlement without healthkit in UIRequiredDeviceCapabilities", () => {
    const meta = makeMetadata({
      entitlements: { "com.apple.developer.healthkit": true },
      requiredDeviceCapabilities: ["arm64"],
    });
    const result = analyzeEntitlements(meta);
    expect(result.findings.some(f => f.title.includes("HealthKit"))).toBe(true);
    expect(result.findings[0]!.severity).toBe("CRITICAL");
  });

  it("passes when HealthKit entitlement matches device capabilities", () => {
    const meta = makeMetadata({
      entitlements: { "com.apple.developer.healthkit": true },
      requiredDeviceCapabilities: ["arm64", "healthkit"],
    });
    const result = analyzeEntitlements(meta);
    expect(result.findings.some(f => f.title.includes("HealthKit"))).toBe(false);
  });

  it("flags remote-notification background mode without aps-environment", () => {
    const meta = makeMetadata({
      backgroundModes: ["remote-notification"],
      entitlements: {},
    });
    const result = analyzeEntitlements(meta);
    expect(result.findings.some(f => f.title.includes("Push"))).toBe(true);
  });

  it("flags invalid associated domain format", () => {
    const meta = makeMetadata({
      entitlements: {
        "com.apple.developer.associated-domains": ["example.com", "applinks:good.com"],
      },
    });
    const result = analyzeEntitlements(meta);
    const finding = result.findings.find(f => f.title.includes("Associated Domain"));
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe("MAJOR");
  });

  it("returns no findings for clean entitlements", () => {
    const meta = makeMetadata();
    const result = analyzeEntitlements(meta);
    expect(result.findings).toHaveLength(0);
  });
});
