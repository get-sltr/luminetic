import { describe, it, expect, beforeEach } from "vitest";
import { analyzeSdks } from "./sdk-analyzer";
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

describe("SDK Analyzer", () => {
  beforeEach(() => resetFindingCounter());

  it("flags UIWebView as CRITICAL", () => {
    const meta = makeMetadata({ frameworks: ["UIWebView"] });
    const result = analyzeSdks(meta);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.severity).toBe("CRITICAL");
    expect(result.findings[0]!.title).toContain("UIWebView");
  });

  it("flags SDK missing required privacy manifest as MAJOR", () => {
    const meta = makeMetadata({
      frameworks: ["FBSDKCoreKit"],
      frameworkDetails: [{ name: "FBSDKCoreKit", hasPrivacyManifest: false, bundleId: null, version: null }],
    });
    const result = analyzeSdks(meta);
    const finding = result.findings.find(f => f.title.includes("FBSDKCoreKit"));
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe("MAJOR");
  });

  it("passes when SDK has privacy manifest", () => {
    const meta = makeMetadata({
      frameworks: ["FBSDKCoreKit"],
      frameworkDetails: [{ name: "FBSDKCoreKit", hasPrivacyManifest: true, bundleId: null, version: null }],
    });
    const result = analyzeSdks(meta);
    expect(result.findings).toHaveLength(0);
  });

  it("returns no findings for clean framework list", () => {
    const meta = makeMetadata({ frameworks: ["SwiftUI", "Combine"] });
    const result = analyzeSdks(meta);
    expect(result.findings).toHaveLength(0);
  });
});
