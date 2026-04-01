import type { IpaMetadata } from "../ipa-parser";
import type { AnalyzerResult, StaticFinding } from "./types";
import { nextFindingId } from "./types";

const GUIDELINE_BASE = "https://developer.apple.com/app-store/review/guidelines";

const VERSION_REGEX = /^\d+(\.\d+){0,2}$/;

export function analyzeBuildConfig(metadata: IpaMetadata): AnalyzerResult {
  const findings: StaticFinding[] = [];

  // ATS: NSAllowsArbitraryLoads = true
  if (metadata.atsConfig?.["NSAllowsArbitraryLoads"] === true) {
    findings.push({
      id: nextFindingId("BC"),
      severity: "MAJOR",
      category: "build_config",
      title: "App Transport Security Disabled (NSAllowsArbitraryLoads)",
      description: "NSAppTransportSecurity has NSAllowsArbitraryLoads set to true. This disables ATS globally, allowing insecure HTTP connections. Apple requires justification for this exception.",
      guideline: "2.1",
      guideline_url: `${GUIDELINE_BASE}/#performance`,
      evidence: "NSAppTransportSecurity.NSAllowsArbitraryLoads = true in Info.plist.",
      remediation: "Remove NSAllowsArbitraryLoads or set it to false. Use NSExceptionDomains for specific domains that require HTTP instead of blanket disabling ATS.",
      confidence: 1.0,
    });
  }

  // Missing ITSAppUsesNonExemptEncryption
  if (metadata.exportCompliance === null) {
    findings.push({
      id: nextFindingId("BC"),
      severity: "MEDIUM",
      category: "build_config",
      title: "Missing Export Compliance Declaration (ITSAppUsesNonExemptEncryption)",
      description: "Info.plist does not contain ITSAppUsesNonExemptEncryption. This will cause an extra step during App Store Connect upload where you must manually answer the export compliance question.",
      guideline: "5.0",
      guideline_url: `${GUIDELINE_BASE}/#legal`,
      evidence: "ITSAppUsesNonExemptEncryption not found in Info.plist.",
      remediation: "Add ITSAppUsesNonExemptEncryption to Info.plist. Set to NO if your app only uses standard system encryption (HTTPS, etc.), or YES if it uses custom encryption.",
      confidence: 1.0,
    });
  }

  // Invalid version string format
  if (metadata.version && !VERSION_REGEX.test(metadata.version)) {
    findings.push({
      id: nextFindingId("BC"),
      severity: "MAJOR",
      category: "build_config",
      title: "Invalid Version String Format (CFBundleShortVersionString)",
      description: `Version string "${metadata.version}" does not match the expected format (e.g. "1.0", "1.0.0"). Apple requires a period-separated list of at most three non-negative integers.`,
      guideline: "2.1",
      guideline_url: `${GUIDELINE_BASE}/#performance`,
      evidence: `CFBundleShortVersionString = "${metadata.version}" in Info.plist.`,
      remediation: "Update CFBundleShortVersionString to use the format X.Y.Z (e.g. 1.0.0).",
      confidence: 1.0,
    });
  }

  // Missing launch storyboard
  if (!metadata.launchStoryboard) {
    findings.push({
      id: nextFindingId("BC"),
      severity: "MAJOR",
      category: "build_config",
      title: "Missing Launch Storyboard (UILaunchStoryboardName)",
      description: "Info.plist does not contain UILaunchStoryboardName. A launch storyboard is required for all apps. Without it, the app will not use the full screen on modern devices.",
      guideline: "4.0",
      guideline_url: `${GUIDELINE_BASE}/#design`,
      evidence: "UILaunchStoryboardName not found in Info.plist.",
      remediation: "Add a LaunchScreen.storyboard to your project and set UILaunchStoryboardName in Info.plist.",
      confidence: 1.0,
    });
  }

  // Background modes declared: check for audio without AVFoundation
  if (metadata.backgroundModes.includes("audio")) {
    const hasAudioFramework = metadata.frameworks.some(f =>
      ["AVFoundation", "AVFAudio", "MediaPlayer", "AudioToolbox"].includes(f)
    );
    if (!hasAudioFramework) {
      findings.push({
        id: nextFindingId("BC"),
        severity: "MAJOR",
        category: "build_config",
        title: "Audio Background Mode Without Audio Framework",
        description: "App declares 'audio' background mode but no audio-related framework (AVFoundation, AVFAudio, MediaPlayer, AudioToolbox) was detected.",
        guideline: "2.5.4",
        guideline_url: `${GUIDELINE_BASE}/#software-requirements`,
        evidence: "'audio' found in UIBackgroundModes. No audio framework detected in embedded frameworks.",
        remediation: "Remove 'audio' from UIBackgroundModes if not needed, or ensure the audio framework is properly linked.",
        confidence: 1.0,
      });
    }
  }

  return { analyzer: "build_config", findings };
}
