import { describe, it, expect, beforeEach } from "vitest";
import { analyzeCodeSigning } from "./code-signing-analyzer";
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

describe("Code Signing Analyzer", () => {
  beforeEach(() => resetFindingCounter());

  it("flags development provisioning profile", () => {
    const meta = makeMetadata({ provisioningType: "development" });
    const result = analyzeCodeSigning(meta);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.severity).toBe("CRITICAL");
    expect(result.findings[0]!.title).toContain("Development");
  });

  it("flags ad-hoc provisioning profile", () => {
    const meta = makeMetadata({ provisioningType: "ad-hoc" });
    const result = analyzeCodeSigning(meta);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.severity).toBe("CRITICAL");
    expect(result.findings[0]!.title).toContain("Ad-Hoc");
  });

  it("flags expired provisioning profile", () => {
    const meta = makeMetadata({ provisioningExpiry: "2020-01-01T00:00:00Z" });
    const result = analyzeCodeSigning(meta);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.title).toContain("Expired");
  });

  it("passes for app-store provisioning type", () => {
    const meta = makeMetadata({ provisioningType: "app-store" });
    const result = analyzeCodeSigning(meta);
    expect(result.findings).toHaveLength(0);
  });

  it("passes when no provisioning info available", () => {
    const meta = makeMetadata();
    const result = analyzeCodeSigning(meta);
    expect(result.findings).toHaveLength(0);
  });
});
