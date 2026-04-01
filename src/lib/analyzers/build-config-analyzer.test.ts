import { describe, it, expect, beforeEach } from "vitest";
import { analyzeBuildConfig } from "./build-config-analyzer";
import { resetFindingCounter } from "./types";
import type { IpaMetadata } from "../ipa-parser";

function makeMetadata(overrides: Partial<IpaMetadata> = {}): IpaMetadata {
  return {
    bundleId: "com.test.app", appName: "Test App", version: "1.0", buildNumber: "1",
    minimumOSVersion: "16.0", exportCompliance: false, supportsIndirectInputEvents: null,
    privacyUsageDescriptions: {}, requiredDeviceCapabilities: [], backgroundModes: [],
    urlSchemes: [], urlTypes: [], queriesSchemes: [], entitlements: {}, frameworks: [],
    xcodeVersion: null, xcodeBuild: null, sdkName: null, sdkBuild: null,
    platformVersion: null, atsConfig: null, sceneManifest: null, launchStoryboard: "LaunchScreen",
    privacyManifest: null, frameworkDetails: [], provisioningType: null, teamId: null,
    provisioningExpiry: null,
    ...overrides,
  };
}

describe("Build Config Analyzer", () => {
  beforeEach(() => resetFindingCounter());

  it("flags NSAllowsArbitraryLoads = true", () => {
    const meta = makeMetadata({ atsConfig: { NSAllowsArbitraryLoads: true } });
    const result = analyzeBuildConfig(meta);
    expect(result.findings.some(f => f.title.includes("App Transport Security"))).toBe(true);
  });

  it("flags missing ITSAppUsesNonExemptEncryption", () => {
    const meta = makeMetadata({ exportCompliance: null });
    const result = analyzeBuildConfig(meta);
    expect(result.findings.some(f => f.title.includes("Export Compliance"))).toBe(true);
  });

  it("flags invalid version string format", () => {
    const meta = makeMetadata({ version: "1.0.0-beta" });
    const result = analyzeBuildConfig(meta);
    expect(result.findings.some(f => f.title.includes("Version String"))).toBe(true);
  });

  it("flags missing launch storyboard", () => {
    const meta = makeMetadata({ launchStoryboard: null });
    const result = analyzeBuildConfig(meta);
    expect(result.findings.some(f => f.title.includes("Launch Storyboard"))).toBe(true);
  });

  it("flags audio background mode without audio framework", () => {
    const meta = makeMetadata({ backgroundModes: ["audio"] });
    const result = analyzeBuildConfig(meta);
    expect(result.findings.some(f => f.title.includes("Audio Background"))).toBe(true);
  });

  it("passes for properly configured app", () => {
    const meta = makeMetadata();
    const result = analyzeBuildConfig(meta);
    expect(result.findings).toHaveLength(0);
  });
});
