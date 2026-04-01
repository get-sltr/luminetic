import type { IpaMetadata } from "../ipa-parser";
import type { AnalyzerResult, StaticFinding } from "./types";
import { nextFindingId } from "./types";

const GUIDELINE_BASE = "https://developer.apple.com/app-store/review/guidelines";

const FRAMEWORK_TO_PERMISSION: Record<string, { key: string; label: string }[]> = {
  AVFoundation: [
    { key: "NSCameraUsageDescription", label: "Camera" },
    { key: "NSMicrophoneUsageDescription", label: "Microphone" },
  ],
  CoreLocation: [
    { key: "NSLocationWhenInUseUsageDescription", label: "Location (When In Use)" },
  ],
  Photos: [
    { key: "NSPhotoLibraryUsageDescription", label: "Photo Library" },
  ],
  PhotosUI: [
    { key: "NSPhotoLibraryUsageDescription", label: "Photo Library" },
  ],
  Contacts: [
    { key: "NSContactsUsageDescription", label: "Contacts" },
  ],
  EventKit: [
    { key: "NSCalendarsUsageDescription", label: "Calendars" },
  ],
  HealthKit: [
    { key: "NSHealthShareUsageDescription", label: "HealthKit (Read)" },
  ],
  Speech: [
    { key: "NSSpeechRecognitionUsageDescription", label: "Speech Recognition" },
  ],
  LocalAuthentication: [
    { key: "NSFaceIDUsageDescription", label: "Face ID" },
  ],
  CoreBluetooth: [
    { key: "NSBluetoothAlwaysUsageDescription", label: "Bluetooth" },
  ],
  CoreMotion: [
    { key: "NSMotionUsageDescription", label: "Motion" },
  ],
};

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

  // Framework imported but no matching NSUsageDescription
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
          guideline: "5.1.1",
          guideline_url: `${GUIDELINE_BASE}/#data-collection-and-storage`,
          evidence: `${framework} detected in embedded frameworks. ${perm.key} not found in Info.plist.`,
          remediation: `Add ${perm.key} to Info.plist with a clear, user-facing explanation of why your app needs ${perm.label.toLowerCase()} access.`,
          confidence: 1.0,
        });
      }
    }
  }

  // NSUsageDescription declared but no matching framework
  for (const key of Object.keys(metadata.privacyUsageDescriptions)) {
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
