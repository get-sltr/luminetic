import { describe, it, expect } from "vitest";
import { analyzeAssets } from "./asset-analyzer";
import type { IpaMetadata } from "../ipa-parser";

function makeMetadata(): IpaMetadata {
  return {
    bundleId: "com.test.app", appName: "Test App", version: "1.0", buildNumber: "1",
    minimumOSVersion: "16.0", exportCompliance: null, supportsIndirectInputEvents: null,
    privacyUsageDescriptions: {}, requiredDeviceCapabilities: [], backgroundModes: [],
    urlSchemes: [], urlTypes: [], queriesSchemes: [], entitlements: {}, frameworks: [],
    xcodeVersion: null, xcodeBuild: null, sdkName: null, sdkBuild: null,
    platformVersion: null, atsConfig: null, sceneManifest: null, launchStoryboard: null,
    privacyManifest: null, frameworkDetails: [], provisioningType: null, teamId: null,
    provisioningExpiry: null,
  };
}

describe("Asset Analyzer", () => {
  it("returns no findings (placeholder for Phase 4)", () => {
    const result = analyzeAssets(makeMetadata());
    expect(result.analyzer).toBe("assets");
    expect(result.findings).toHaveLength(0);
  });
});
