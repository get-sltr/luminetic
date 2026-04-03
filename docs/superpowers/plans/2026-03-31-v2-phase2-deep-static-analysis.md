# V2 Phase 2: Deep Static Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace AI-guessed findings with proven static analysis findings extracted directly from the IPA binary, feeding structured evidence to the AI models instead of raw metadata text.

**Architecture:** Build focused analyzer modules that each inspect one aspect of the IPA (privacy, entitlements, SDKs, assets, build config, code signing). Each analyzer receives the parsed IPA data and returns structured findings with confidence 1.0. The existing `ipa-parser.ts` is extended to extract additional data (privacy manifests, Xcode version, asset catalog, provisioning profile type). The Lambda prompt is updated to receive structured Layer 1 findings as input.

**Tech Stack:** TypeScript, JSZip (already in use), bplist-parser (already in use), vitest, existing S3/DynamoDB infrastructure.

---

## File Structure

### New files to create:
- `src/lib/analyzers/types.ts` -- Shared types: `StaticFinding`, `AnalyzerResult`, severity enum, category enum
- `src/lib/analyzers/privacy-analyzer.ts` -- Privacy manifest + NSUsageDescription cross-referencing
- `src/lib/analyzers/entitlements-analyzer.ts` -- Entitlements vs Info.plist cross-check
- `src/lib/analyzers/sdk-analyzer.ts` -- Embedded SDK audit (deprecated SDKs, UIWebView, known-flagged)
- `src/lib/analyzers/build-config-analyzer.ts` -- Info.plist config checks (ATS, min OS, version format, background modes)
- `src/lib/analyzers/code-signing-analyzer.ts` -- Provisioning profile type, team ID consistency
- `src/lib/analyzers/asset-analyzer.ts` -- App icon presence, launch screen check
- `src/lib/analyzers/orchestrator.ts` -- Runs all analyzers, collects results, produces Layer 1 JSON
- `src/lib/analyzers/types.test.ts` -- Tests for type utilities
- `src/lib/analyzers/privacy-analyzer.test.ts` -- Tests for privacy analyzer
- `src/lib/analyzers/entitlements-analyzer.test.ts` -- Tests for entitlements analyzer
- `src/lib/analyzers/sdk-analyzer.test.ts` -- Tests for SDK analyzer
- `src/lib/analyzers/build-config-analyzer.test.ts` -- Tests for build config analyzer
- `src/lib/analyzers/code-signing-analyzer.test.ts` -- Tests for code signing analyzer
- `src/lib/analyzers/asset-analyzer.test.ts` -- Tests for asset analyzer
- `src/lib/analyzers/orchestrator.test.ts` -- Tests for orchestrator

### Existing files to modify:
- `src/lib/ipa-parser.ts` -- Extend `IpaMetadata` with new fields (xcode version, SDK version, privacy manifests, provisioning type, scene manifest, ATS config, framework details)
- `lambda/analyze/index.mjs` -- Update `buildMetadataContext` equivalent to accept structured Layer 1 JSON, update prompts to reference structured findings

---

## Task 1: Shared Types

**Files:**
- Create: `src/lib/analyzers/types.ts`
- Create: `src/lib/analyzers/types.test.ts`

- [ ] **Step 1: Write the types file**

```typescript
// src/lib/analyzers/types.ts

export type Severity = "CRITICAL" | "MAJOR" | "MEDIUM" | "MINOR";

export type FindingCategory =
  | "privacy"
  | "entitlements"
  | "sdk"
  | "build_config"
  | "code_signing"
  | "assets";

export interface StaticFinding {
  id: string;
  severity: Severity;
  category: FindingCategory;
  title: string;
  description: string;
  guideline: string;
  guideline_url: string;
  evidence: string;
  remediation: string;
  confidence: 1.0;
}

export interface AnalyzerResult {
  analyzer: string;
  findings: StaticFinding[];
}

export interface Layer1Output {
  layer: "static_analysis";
  findings: StaticFinding[];
  metadata: Layer1Metadata;
}

export interface Layer1Metadata {
  bundle_id: string | null;
  bundle_version: string | null;
  build_number: string | null;
  minimum_os: string | null;
  xcode_version: string | null;
  sdk_version: string | null;
  embedded_frameworks: string[];
  entitlements: string[];
  provisioning_type: string | null;
  privacy_manifest_present: boolean;
  framework_privacy_manifests: string[];
}

/** Counter for generating unique finding IDs within a scan. */
let findingCounter = 0;

export function resetFindingCounter(): void {
  findingCounter = 0;
}

export function nextFindingId(prefix: string): string {
  findingCounter++;
  return `${prefix}-${String(findingCounter).padStart(3, "0")}`;
}
```

- [ ] **Step 2: Write tests for ID generation**

```typescript
// src/lib/analyzers/types.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { nextFindingId, resetFindingCounter } from "./types";

describe("Finding ID generation", () => {
  beforeEach(() => {
    resetFindingCounter();
  });

  it("generates sequential IDs with prefix", () => {
    expect(nextFindingId("SA")).toBe("SA-001");
    expect(nextFindingId("SA")).toBe("SA-002");
    expect(nextFindingId("PV")).toBe("PV-003");
  });

  it("resets counter", () => {
    nextFindingId("SA");
    nextFindingId("SA");
    resetFindingCounter();
    expect(nextFindingId("SA")).toBe("SA-001");
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/lib/analyzers/types.test.ts`
Expected: 2 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/analyzers/types.ts src/lib/analyzers/types.test.ts
git commit -m "feat(v2): add shared static analysis types and finding ID generator"
```

---

## Task 2: Extend IPA Parser

**Files:**
- Modify: `src/lib/ipa-parser.ts`

The current parser extracts basic Info.plist fields. We need additional data for the analyzers.

- [ ] **Step 1: Add new fields to IpaMetadata interface**

Add these fields to the existing `IpaMetadata` interface in `src/lib/ipa-parser.ts`:

```typescript
// Add to existing IpaMetadata interface:
  xcodeVersion: string | null;        // DTXcode
  xcodeBuild: string | null;          // DTXcodeBuild
  sdkName: string | null;             // DTSDKName
  sdkBuild: string | null;            // DTSDKBuild
  platformVersion: string | null;     // DTPlatformVersion
  atsConfig: Record<string, unknown> | null; // NSAppTransportSecurity
  sceneManifest: Record<string, unknown> | null; // UIApplicationSceneManifest
  launchStoryboard: string | null;    // UILaunchStoryboardName
  privacyManifest: Record<string, unknown> | null; // Parsed PrivacyInfo.xcprivacy
  frameworkDetails: FrameworkDetail[];
  provisioningType: string | null;    // "app-store" | "ad-hoc" | "development" | "enterprise" | null
  teamId: string | null;              // from embedded.mobileprovision
  provisioningExpiry: string | null;  // ExpirationDate from mobileprovision
```

- [ ] **Step 2: Add FrameworkDetail interface**

```typescript
export interface FrameworkDetail {
  name: string;
  hasPrivacyManifest: boolean;
  bundleId: string | null;
  version: string | null;
}
```

- [ ] **Step 3: Extract new Info.plist fields in parseIpa()**

In the `parseIpa` function, after the existing field extraction (around line 280), add:

```typescript
      xcodeVersion: getString("DTXcode"),
      xcodeBuild: getString("DTXcodeBuild"),
      sdkName: getString("DTSDKName"),
      sdkBuild: getString("DTSDKBuild"),
      platformVersion: getString("DTPlatformVersion"),
      atsConfig: (() => {
        const ats = plist["NSAppTransportSecurity"];
        return (ats && typeof ats === "object" && !Array.isArray(ats))
          ? ats as Record<string, unknown> : null;
      })(),
      sceneManifest: (() => {
        const sm = plist["UIApplicationSceneManifest"];
        return (sm && typeof sm === "object" && !Array.isArray(sm))
          ? sm as Record<string, unknown> : null;
      })(),
      launchStoryboard: getString("UILaunchStoryboardName"),
```

- [ ] **Step 4: Extract privacy manifest from PrivacyInfo.xcprivacy**

Add this extraction after the frameworks loop:

```typescript
  // Parse app-level PrivacyInfo.xcprivacy
  let privacyManifest: Record<string, unknown> | null = null;
  const privacyFile = zip.file(`${appDir}PrivacyInfo.xcprivacy`);
  if (privacyFile) {
    try {
      const privacyData = await privacyFile.async("uint8array");
      const privacyText = new TextDecoder("utf-8", { fatal: false }).decode(privacyData);
      if (privacyText.startsWith("bplist")) {
        const parsed = bplist.parseBuffer(Buffer.from(privacyData));
        if (parsed?.[0] && typeof parsed[0] === "object") privacyManifest = parsed[0] as Record<string, unknown>;
      } else {
        privacyManifest = parseXmlPlist(privacyText);
      }
    } catch { /* privacy manifest parse failed, leave null */ }
  }
```

- [ ] **Step 5: Extract framework details with privacy manifests**

Replace the existing simple frameworks loop with:

```typescript
  const frameworksPrefix = `${appDir}Frameworks/`;
  const frameworkNames: string[] = [];
  const frameworkDetails: FrameworkDetail[] = [];

  for (const path of Object.keys(zip.files)) {
    if (path.startsWith(frameworksPrefix) && path.endsWith(".framework/")) {
      const name = path.slice(frameworksPrefix.length, -".framework/".length);
      if (!name.includes("/")) {
        frameworkNames.push(name);

        // Check for framework-level privacy manifest
        const fwPrivacyPath = `${frameworksPrefix}${name}.framework/PrivacyInfo.xcprivacy`;
        const hasPrivacyManifest = !!zip.file(fwPrivacyPath);

        // Try to get framework Info.plist for version
        let fwBundleId: string | null = null;
        let fwVersion: string | null = null;
        const fwPlistPath = `${frameworksPrefix}${name}.framework/Info.plist`;
        const fwPlistFile = zip.file(fwPlistPath);
        if (fwPlistFile) {
          try {
            const fwPlistData = await fwPlistFile.async("uint8array");
            const fwPlistText = new TextDecoder("utf-8", { fatal: false }).decode(fwPlistData);
            let fwPlist: Record<string, unknown> | null = null;
            if (fwPlistText.startsWith("bplist")) {
              const parsed = bplist.parseBuffer(Buffer.from(fwPlistData));
              if (parsed?.[0] && typeof parsed[0] === "object") fwPlist = parsed[0] as Record<string, unknown>;
            } else {
              fwPlist = parseXmlPlist(fwPlistText);
            }
            if (fwPlist) {
              fwBundleId = typeof fwPlist["CFBundleIdentifier"] === "string" ? fwPlist["CFBundleIdentifier"] : null;
              fwVersion = typeof fwPlist["CFBundleShortVersionString"] === "string" ? fwPlist["CFBundleShortVersionString"] : null;
            }
          } catch { /* framework plist parse failed */ }
        }

        frameworkDetails.push({ name, hasPrivacyManifest, bundleId: fwBundleId, version: fwVersion });
      }
    }
  }
```

- [ ] **Step 6: Extract provisioning profile metadata**

Update the provisioning extraction to capture type, team ID, and expiry:

```typescript
  let provisioningType: string | null = null;
  let teamId: string | null = null;
  let provisioningExpiry: string | null = null;

  if (provisionFile) {
    const provisionData = await provisionFile.async("uint8array");
    entitlements = extractEntitlementsFromProvision(provisionData);

    // Extract additional provisioning metadata
    const provText = new TextDecoder("utf-8", { fatal: false }).decode(provisionData);
    const provPlistStart = provText.indexOf("<?xml");
    const provPlistEnd = provText.indexOf("</plist>");
    if (provPlistStart !== -1 && provPlistEnd !== -1) {
      const provPlistXml = provText.slice(provPlistStart, provPlistEnd + "</plist>".length);
      const provPlist = parseXmlPlist(provPlistXml);
      if (provPlist) {
        // Determine provisioning type
        const provisions = provPlist["ProvisionsAllDevices"];
        const provisionedDevices = provPlist["ProvisionedDevices"];
        if (provisions === true) {
          provisioningType = "enterprise";
        } else if (provisionedDevices && Array.isArray(provisionedDevices)) {
          provisioningType = entitlements["get-task-allow"] === true ? "development" : "ad-hoc";
        } else {
          provisioningType = "app-store";
        }

        // Team ID
        const teamIds = provPlist["TeamIdentifier"];
        if (Array.isArray(teamIds) && typeof teamIds[0] === "string") teamId = teamIds[0];

        // Expiration
        if (typeof provPlist["ExpirationDate"] === "string") provisioningExpiry = provPlist["ExpirationDate"];
      }
    }
  }
```

- [ ] **Step 7: Wire new fields into the return object**

Add to the metadata return object:

```typescript
      privacyManifest,
      frameworkDetails,
      provisioningType,
      teamId,
      provisioningExpiry,
```

And update `frameworks` to use `frameworkNames.sort()`.

- [ ] **Step 8: Run existing tests to verify nothing is broken**

Run: `npx vitest run`
Expected: All existing tests pass (the parser changes are additive)

- [ ] **Step 9: Commit**

```bash
git add src/lib/ipa-parser.ts
git commit -m "feat(v2): extend IPA parser with privacy manifests, framework details, provisioning metadata"
```

---

## Task 3: Privacy Analyzer

**Files:**
- Create: `src/lib/analyzers/privacy-analyzer.ts`
- Create: `src/lib/analyzers/privacy-analyzer.test.ts`

- [ ] **Step 1: Write test file**

```typescript
// src/lib/analyzers/privacy-analyzer.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { analyzePrivacy } from "./privacy-analyzer";
import { resetFindingCounter } from "./types";
import type { IpaMetadata } from "../ipa-parser";

function makeMetadata(overrides: Partial<IpaMetadata> = {}): IpaMetadata {
  return {
    bundleId: "com.test.app",
    appName: "Test App",
    version: "1.0",
    buildNumber: "1",
    minimumOSVersion: "16.0",
    exportCompliance: null,
    supportsIndirectInputEvents: null,
    privacyUsageDescriptions: {},
    requiredDeviceCapabilities: [],
    backgroundModes: [],
    urlSchemes: [],
    urlTypes: [],
    queriesSchemes: [],
    entitlements: {},
    frameworks: [],
    xcodeVersion: null,
    xcodeBuild: null,
    sdkName: null,
    sdkBuild: null,
    platformVersion: null,
    atsConfig: null,
    sceneManifest: null,
    launchStoryboard: null,
    privacyManifest: null,
    frameworkDetails: [],
    provisioningType: null,
    teamId: null,
    provisioningExpiry: null,
    ...overrides,
  };
}

describe("Privacy Analyzer", () => {
  beforeEach(() => resetFindingCounter());

  it("flags missing NSCameraUsageDescription when AVFoundation is imported", () => {
    const meta = makeMetadata({
      frameworks: ["AVFoundation"],
      frameworkDetails: [{ name: "AVFoundation", hasPrivacyManifest: false, bundleId: null, version: null }],
    });
    const result = analyzePrivacy(meta);
    const cameraFinding = result.findings.find(f => f.title.includes("Camera"));
    expect(cameraFinding).toBeDefined();
    expect(cameraFinding!.severity).toBe("CRITICAL");
  });

  it("passes when AVFoundation is present with NSCameraUsageDescription", () => {
    const meta = makeMetadata({
      frameworks: ["AVFoundation"],
      frameworkDetails: [{ name: "AVFoundation", hasPrivacyManifest: false, bundleId: null, version: null }],
      privacyUsageDescriptions: { NSCameraUsageDescription: "We use the camera to scan documents." },
    });
    const result = analyzePrivacy(meta);
    const cameraFinding = result.findings.find(f => f.title.includes("Camera"));
    expect(cameraFinding).toBeUndefined();
  });

  it("flags missing NSLocationWhenInUseUsageDescription when CoreLocation is imported", () => {
    const meta = makeMetadata({
      frameworks: ["CoreLocation"],
      frameworkDetails: [{ name: "CoreLocation", hasPrivacyManifest: false, bundleId: null, version: null }],
    });
    const result = analyzePrivacy(meta);
    const locationFinding = result.findings.find(f => f.title.includes("Location"));
    expect(locationFinding).toBeDefined();
    expect(locationFinding!.severity).toBe("CRITICAL");
  });

  it("flags unnecessary permission when no matching framework exists", () => {
    const meta = makeMetadata({
      frameworks: [],
      frameworkDetails: [],
      privacyUsageDescriptions: { NSCameraUsageDescription: "Camera access" },
    });
    const result = analyzePrivacy(meta);
    const unnecessary = result.findings.find(f => f.severity === "MINOR" && f.title.includes("Camera"));
    expect(unnecessary).toBeDefined();
  });

  it("returns no findings for a clean app", () => {
    const meta = makeMetadata();
    const result = analyzePrivacy(meta);
    expect(result.findings).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/analyzers/privacy-analyzer.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement privacy analyzer**

```typescript
// src/lib/analyzers/privacy-analyzer.ts
import type { IpaMetadata } from "../ipa-parser";
import type { AnalyzerResult, StaticFinding } from "./types";
import { nextFindingId } from "./types";

const GUIDELINE_BASE = "https://developer.apple.com/app-store/review/guidelines";

/**
 * Maps framework names to the NSUsageDescription keys they require.
 * Only includes mappings where the framework import definitively proves the need.
 */
const FRAMEWORK_TO_PERMISSION: Record<string, { key: string; label: string; guideline: string }[]> = {
  AVFoundation: [
    { key: "NSCameraUsageDescription", label: "Camera", guideline: "5.1.1" },
    { key: "NSMicrophoneUsageDescription", label: "Microphone", guideline: "5.1.1" },
  ],
  CoreLocation: [
    { key: "NSLocationWhenInUseUsageDescription", label: "Location (When In Use)", guideline: "5.1.1" },
  ],
  Photos: [
    { key: "NSPhotoLibraryUsageDescription", label: "Photo Library", guideline: "5.1.1" },
  ],
  PhotosUI: [
    { key: "NSPhotoLibraryUsageDescription", label: "Photo Library", guideline: "5.1.1" },
  ],
  Contacts: [
    { key: "NSContactsUsageDescription", label: "Contacts", guideline: "5.1.1" },
  ],
  EventKit: [
    { key: "NSCalendarsUsageDescription", label: "Calendars", guideline: "5.1.1" },
  ],
  HealthKit: [
    { key: "NSHealthShareUsageDescription", label: "HealthKit (Read)", guideline: "5.1.1" },
  ],
  Speech: [
    { key: "NSSpeechRecognitionUsageDescription", label: "Speech Recognition", guideline: "5.1.1" },
  ],
  LocalAuthentication: [
    { key: "NSFaceIDUsageDescription", label: "Face ID", guideline: "5.1.1" },
  ],
  CoreBluetooth: [
    { key: "NSBluetoothAlwaysUsageDescription", label: "Bluetooth", guideline: "5.1.1" },
  ],
  CoreMotion: [
    { key: "NSMotionUsageDescription", label: "Motion", guideline: "5.1.1" },
  ],
};

/**
 * Maps NSUsageDescription keys back to framework names for reverse checking.
 */
const PERMISSION_TO_FRAMEWORKS: Record<string, string[]> = {};
for (const [framework, perms] of Object.entries(FRAMEWORK_TO_PERMISSION)) {
  for (const perm of perms) {
    if (!PERMISSION_TO_FRAMEWORKS[perm.key]) PERMISSION_TO_FRAMEWORKS[perm.key] = [];
    PERMISSION_TO_FRAMEWORKS[perm.key]!.push(framework);
  }
}

export function analyzePrivacy(metadata: IpaMetadata): AnalyzerResult {
  const findings: StaticFinding[] = [];
  const frameworkSet = new Set(metadata.frameworks);

  // 1. Check: framework imported but no matching NSUsageDescription
  for (const [framework, permissions] of Object.entries(FRAMEWORK_TO_PERMISSION)) {
    if (!frameworkSet.has(framework)) continue;
    for (const perm of permissions) {
      if (!metadata.privacyUsageDescriptions[perm.key]) {
        findings.push({
          id: nextFindingId("PV"),
          severity: "CRITICAL",
          category: "privacy",
          title: `Missing ${perm.label} Usage Description (${perm.key})`,
          description: `App imports ${framework} framework but Info.plist does not contain ${perm.key}. Apple will reject this app.`,
          guideline: perm.guideline,
          guideline_url: `${GUIDELINE_BASE}/#data-collection-and-storage`,
          evidence: `${framework} detected in embedded frameworks. ${perm.key} not found in Info.plist.`,
          remediation: `Add ${perm.key} to Info.plist with a clear, user-facing explanation of why your app needs ${perm.label.toLowerCase()} access.`,
          confidence: 1.0,
        });
      }
    }
  }

  // 2. Check: NSUsageDescription declared but no matching framework imported
  for (const [key] of Object.entries(metadata.privacyUsageDescriptions)) {
    const expectedFrameworks = PERMISSION_TO_FRAMEWORKS[key];
    if (!expectedFrameworks) continue;
    const hasAnyFramework = expectedFrameworks.some(fw => frameworkSet.has(fw));
    if (!hasAnyFramework) {
      findings.push({
        id: nextFindingId("PV"),
        severity: "MINOR",
        category: "privacy",
        title: `Unnecessary ${key} Permission Declaration`,
        description: `Info.plist declares ${key} but no corresponding framework (${expectedFrameworks.join(", ")}) was detected. Apple may question this.`,
        guideline: "5.1.1",
        guideline_url: `${GUIDELINE_BASE}/#data-collection-and-storage`,
        evidence: `${key} found in Info.plist. None of [${expectedFrameworks.join(", ")}] detected in embedded frameworks.`,
        remediation: `Remove ${key} from Info.plist if your app does not need this permission, or verify the framework is properly linked.`,
        confidence: 1.0,
      });
    }
  }

  return { analyzer: "privacy", findings };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/analyzers/privacy-analyzer.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/analyzers/privacy-analyzer.ts src/lib/analyzers/privacy-analyzer.test.ts
git commit -m "feat(v2): add privacy analyzer with framework-permission cross-referencing"
```

---

## Task 4: Entitlements Analyzer

**Files:**
- Create: `src/lib/analyzers/entitlements-analyzer.ts`
- Create: `src/lib/analyzers/entitlements-analyzer.test.ts`

- [ ] **Step 1: Write test file**

```typescript
// src/lib/analyzers/entitlements-analyzer.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { analyzeEntitlements } from "./entitlements-analyzer";
import { resetFindingCounter } from "./types";
import type { IpaMetadata } from "../ipa-parser";

// Use the same makeMetadata helper pattern from Task 3 tests
// (copy full makeMetadata function here)

describe("Entitlements Analyzer", () => {
  beforeEach(() => resetFindingCounter());

  it("flags HealthKit entitlement without healthkit in UIRequiredDeviceCapabilities", () => {
    const meta = makeMetadata({
      entitlements: { "com.apple.developer.healthkit": true },
      requiredDeviceCapabilities: ["arm64"],
    });
    const result = analyzeEntitlements(meta);
    expect(result.findings.some(f => f.title.includes("HealthKit"))).toBe(true);
  });

  it("passes when HealthKit entitlement matches device capabilities", () => {
    const meta = makeMetadata({
      entitlements: { "com.apple.developer.healthkit": true },
      requiredDeviceCapabilities: ["arm64", "healthkit"],
      frameworks: ["HealthKit"],
      frameworkDetails: [{ name: "HealthKit", hasPrivacyManifest: false, bundleId: null, version: null }],
    });
    const result = analyzeEntitlements(meta);
    expect(result.findings.some(f => f.title.includes("HealthKit") && f.severity === "CRITICAL")).toBe(false);
  });

  it("flags push entitlement without aps-environment", () => {
    const meta = makeMetadata({
      entitlements: {},
      backgroundModes: ["remote-notification"],
    });
    const result = analyzeEntitlements(meta);
    expect(result.findings.some(f => f.title.includes("Push"))).toBe(true);
  });

  it("returns no findings for clean entitlements", () => {
    const meta = makeMetadata();
    const result = analyzeEntitlements(meta);
    expect(result.findings).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Implement entitlements analyzer**

Build the analyzer that cross-checks entitlements against Info.plist capabilities, framework imports, and background modes. Flag mismatches as CRITICAL (guaranteed rejections).

Key checks:
- HealthKit entitlement without `healthkit` in `UIRequiredDeviceCapabilities`
- `aps-environment` entitlement needed when `remote-notification` is in background modes
- Associated domains format validation (`applinks:`, `webcredentials:`)
- iCloud entitlement without container identifiers

- [ ] **Step 3: Run tests, verify pass**
- [ ] **Step 4: Commit**

---

## Task 5: SDK Analyzer

**Files:**
- Create: `src/lib/analyzers/sdk-analyzer.ts`
- Create: `src/lib/analyzers/sdk-analyzer.test.ts`

- [ ] **Step 1: Write tests**

Key test cases:
- Flags UIWebView usage (deprecated since April 2020)
- Flags known problematic SDKs from Apple's list
- Flags SDKs that require privacy manifests but don't have one
- Passes for clean SDK set

- [ ] **Step 2: Implement SDK analyzer**

Maintain a list of:
- Deprecated/flagged SDKs (UIWebView, etc.)
- SDKs requiring privacy manifests (Apple's third-party SDK list: Facebook, Google Analytics, Firebase, Crashlytics, etc.)
- Check `frameworkDetails[].hasPrivacyManifest` against the required list

- [ ] **Step 3: Run tests, verify pass**
- [ ] **Step 4: Commit**

---

## Task 6: Build Config Analyzer

**Files:**
- Create: `src/lib/analyzers/build-config-analyzer.ts`
- Create: `src/lib/analyzers/build-config-analyzer.test.ts`

- [ ] **Step 1: Write tests**

Key test cases:
- Flags `NSAllowsArbitraryLoads = true` in ATS config
- Flags missing `ITSAppUsesNonExemptEncryption`
- Flags invalid version string format
- Flags missing `UILaunchStoryboardName`
- Flags background modes without matching framework usage
- Flags outdated `MinimumOSVersion` below Apple's current floor
- Flags missing `UIApplicationSceneManifest` for modern apps
- Passes for properly configured app

- [ ] **Step 2: Implement build config analyzer**

Check all Info.plist configuration items from spec section 1.6.

- [ ] **Step 3: Run tests, verify pass**
- [ ] **Step 4: Commit**

---

## Task 7: Code Signing Analyzer

**Files:**
- Create: `src/lib/analyzers/code-signing-analyzer.ts`
- Create: `src/lib/analyzers/code-signing-analyzer.test.ts`

- [ ] **Step 1: Write tests**

Key test cases:
- Flags development provisioning profile (not App Store distribution)
- Flags ad-hoc provisioning profile
- Flags expired provisioning profile
- Passes for app-store provisioning type

- [ ] **Step 2: Implement code signing analyzer**

Uses `provisioningType`, `teamId`, `provisioningExpiry` from extended metadata.

- [ ] **Step 3: Run tests, verify pass**
- [ ] **Step 4: Commit**

---

## Task 8: Asset Analyzer

**Files:**
- Create: `src/lib/analyzers/asset-analyzer.ts`
- Create: `src/lib/analyzers/asset-analyzer.test.ts`

- [ ] **Step 1: Write tests**

Key test cases:
- Flags missing launch storyboard
- Passes when launch storyboard is present

- [ ] **Step 2: Implement asset analyzer**

Checks `launchStoryboard` field from metadata. Note: deep asset catalog (Assets.car) parsing requires native tooling and will be deferred to Phase 4 or beyond. For now, check what is provable from Info.plist and zip file listing.

- [ ] **Step 3: Run tests, verify pass**
- [ ] **Step 4: Commit**

---

## Task 9: Orchestrator

**Files:**
- Create: `src/lib/analyzers/orchestrator.ts`
- Create: `src/lib/analyzers/orchestrator.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// src/lib/analyzers/orchestrator.test.ts
import { describe, it, expect } from "vitest";
import { runStaticAnalysis } from "./orchestrator";
import type { IpaMetadata } from "../ipa-parser";

describe("Static Analysis Orchestrator", () => {
  it("runs all analyzers and returns Layer1Output", () => {
    const meta = makeMetadata({
      frameworks: ["AVFoundation"],
      frameworkDetails: [{ name: "AVFoundation", hasPrivacyManifest: false, bundleId: null, version: null }],
      // Missing NSCameraUsageDescription -- should produce a finding
    });
    const result = runStaticAnalysis(meta);
    expect(result.layer).toBe("static_analysis");
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings[0]!.confidence).toBe(1.0);
    expect(result.metadata.bundle_id).toBe("com.test.app");
  });

  it("returns empty findings for a clean app", () => {
    const meta = makeMetadata();
    const result = runStaticAnalysis(meta);
    expect(result.findings).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Implement orchestrator**

```typescript
// src/lib/analyzers/orchestrator.ts
import type { IpaMetadata } from "../ipa-parser";
import type { Layer1Output, StaticFinding } from "./types";
import { resetFindingCounter } from "./types";
import { analyzePrivacy } from "./privacy-analyzer";
import { analyzeEntitlements } from "./entitlements-analyzer";
import { analyzeSdks } from "./sdk-analyzer";
import { analyzeBuildConfig } from "./build-config-analyzer";
import { analyzeCodeSigning } from "./code-signing-analyzer";
import { analyzeAssets } from "./asset-analyzer";

export function runStaticAnalysis(metadata: IpaMetadata): Layer1Output {
  resetFindingCounter();

  const allFindings: StaticFinding[] = [];

  const analyzers = [
    analyzePrivacy,
    analyzeEntitlements,
    analyzeSdks,
    analyzeBuildConfig,
    analyzeCodeSigning,
    analyzeAssets,
  ];

  for (const analyzer of analyzers) {
    const result = analyzer(metadata);
    allFindings.push(...result.findings);
  }

  // Sort by severity: CRITICAL > MAJOR > MEDIUM > MINOR
  const severityOrder = { CRITICAL: 0, MAJOR: 1, MEDIUM: 2, MINOR: 3 };
  allFindings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    layer: "static_analysis",
    findings: allFindings,
    metadata: {
      bundle_id: metadata.bundleId,
      bundle_version: metadata.version,
      build_number: metadata.buildNumber,
      minimum_os: metadata.minimumOSVersion,
      xcode_version: metadata.xcodeVersion,
      sdk_version: metadata.sdkName,
      embedded_frameworks: metadata.frameworks,
      entitlements: Object.keys(metadata.entitlements),
      provisioning_type: metadata.provisioningType,
      privacy_manifest_present: metadata.privacyManifest !== null,
      framework_privacy_manifests: metadata.frameworkDetails
        .filter(f => f.hasPrivacyManifest)
        .map(f => f.name),
    },
  };
}
```

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/lib/analyzers/orchestrator.ts src/lib/analyzers/orchestrator.test.ts
git commit -m "feat(v2): add static analysis orchestrator combining all analyzers"
```

---

## Task 10: Wire Layer 1 into analyze-stream route

**Files:**
- Modify: `src/app/api/analyze-stream/route.ts`

- [ ] **Step 1: Import orchestrator**

```typescript
import { runStaticAnalysis } from "@/lib/analyzers/orchestrator";
```

- [ ] **Step 2: Run static analysis after IPA parse, include in Lambda payload**

After `parseIpa()` succeeds and `contextForAI` is built, add:

```typescript
      // Run Layer 1 static analysis
      const layer1 = runStaticAnalysis(ipaMetadata);
```

Then include `layer1` in the Lambda payload alongside `contextForAI`:

```typescript
      Payload: Buffer.from(JSON.stringify({
        userId: authUser.userId,
        scanSK,
        scanId,
        contextForAI,
        layer1, // structured static analysis findings
        ipaMetadata: ipaMetadata ? { ... } : null,
        s3Key: parsed.s3Key,
        bundleId: ipaMetadata?.bundleId || parsed.bundleId,
      })),
```

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/app/api/analyze-stream/route.ts
git commit -m "feat(v2): wire Layer 1 static analysis into scan pipeline"
```

---

## Task 11: Update Lambda to use Layer 1 findings

**Files:**
- Modify: `lambda/analyze/index.mjs`

- [ ] **Step 1: Accept layer1 from event payload**

In the handler, destructure `layer1` from the event:

```javascript
const { userId, scanSK, scanId, contextForAI, layer1, ipaMetadata, s3Key, bundleId } = event;
```

- [ ] **Step 2: Build enhanced context string that includes Layer 1 findings**

Before the Stage 1 model calls, build a richer context:

```javascript
    // Build enhanced context with Layer 1 structured findings
    let enhancedContext = contextForAI;
    if (layer1 && layer1.findings) {
      const l1Section = `\n\n## STATIC ANALYSIS FINDINGS (Layer 1 - Proven Facts, confidence 1.0)\n` +
        `These findings are proven from the binary. Do NOT dispute them. Focus on providing remediation.\n\n` +
        JSON.stringify(layer1.findings, null, 2) +
        `\n\n## STATIC ANALYSIS METADATA\n` +
        JSON.stringify(layer1.metadata, null, 2);
      enhancedContext = contextForAI + l1Section;
    }
```

- [ ] **Step 3: Pass enhancedContext to all Stage 1 model calls**

Replace `contextForAI` with `enhancedContext` in the `callGemini`, `callSonnet`, `callDeepSeek` calls:

```javascript
    const [gemini, sonnet, deepseek] = await Promise.all([
      callGemini(enhancedContext),
      callSonnet(enhancedContext),
      callDeepSeek(enhancedContext),
    ]);
```

- [ ] **Step 4: Include layer1 findings in the merged result**

In `mergeResults`, add layer1 data to the output:

```javascript
    layer1_findings: layer1?.findings || [],
    layer1_metadata: layer1?.metadata || null,
```

- [ ] **Step 5: Build, deploy Lambda**

```bash
cd lambda/analyze
npx esbuild index.mjs --bundle --platform=node --target=node20 --format=esm --outfile=dist/index.mjs --minify '--external:@aws-sdk/*'
cd dist && zip -q ../lambda-deploy.zip index.mjs && cd ..
aws lambda update-function-code --function-name luminetic-analyze --zip-file fileb://lambda-deploy.zip --no-cli-pager
rm lambda-deploy.zip
```

- [ ] **Step 6: Commit**

```bash
git add lambda/analyze/index.mjs
git commit -m "feat(v2): Lambda accepts Layer 1 findings, feeds structured evidence to AI models"
```

---

## Task 12: Final integration test

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Final commit with all remaining changes**

```bash
git add -A
git commit -m "feat(v2): Phase 2 complete - deep static analysis pipeline"
```
