import { describe, it, expect, beforeEach } from "vitest";
import { analyzePrivacy } from "./privacy-analyzer";
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

describe("Privacy Analyzer", () => {
  beforeEach(() => resetFindingCounter());

  it("flags missing NSCameraUsageDescription when AVFoundation is imported", () => {
    const meta = makeMetadata({ frameworks: ["AVFoundation"] });
    const result = analyzePrivacy(meta);
    const cameraFinding = result.findings.find(f => f.title.includes("Camera"));
    expect(cameraFinding).toBeDefined();
    expect(cameraFinding!.severity).toBe("CRITICAL");
  });

  it("passes when AVFoundation is present with NSCameraUsageDescription", () => {
    const meta = makeMetadata({
      frameworks: ["AVFoundation"],
      privacyUsageDescriptions: {
        NSCameraUsageDescription: "We use the camera to scan documents.",
        NSMicrophoneUsageDescription: "We use the microphone for voice notes.",
      },
    });
    const result = analyzePrivacy(meta);
    const cameraFinding = result.findings.find(f => f.title.includes("Camera"));
    expect(cameraFinding).toBeUndefined();
  });

  it("flags missing NSLocationWhenInUseUsageDescription when CoreLocation is imported", () => {
    const meta = makeMetadata({ frameworks: ["CoreLocation"] });
    const result = analyzePrivacy(meta);
    const locationFinding = result.findings.find(f => f.title.includes("Location"));
    expect(locationFinding).toBeDefined();
    expect(locationFinding!.severity).toBe("CRITICAL");
  });

  it("flags unnecessary permission when no matching framework exists", () => {
    const meta = makeMetadata({
      privacyUsageDescriptions: { NSCameraUsageDescription: "Camera access" },
    });
    const result = analyzePrivacy(meta);
    const unnecessary = result.findings.find(f => f.severity === "MINOR");
    expect(unnecessary).toBeDefined();
    expect(unnecessary!.title).toContain("NSCameraUsageDescription");
  });

  it("returns no findings for a clean app", () => {
    const meta = makeMetadata();
    const result = analyzePrivacy(meta);
    expect(result.findings).toHaveLength(0);
  });
});
