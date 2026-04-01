import type { IpaMetadata } from "../ipa-parser";
import type { Layer1Output, StaticFinding } from "./types";
import { resetFindingCounter } from "./types";
import { analyzePrivacy } from "./privacy-analyzer";
import { analyzeEntitlements } from "./entitlements-analyzer";
import { analyzeSdks } from "./sdk-analyzer";
import { analyzeBuildConfig } from "./build-config-analyzer";
import { analyzeCodeSigning } from "./code-signing-analyzer";
import { analyzeAssets } from "./asset-analyzer";

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, MAJOR: 1, MEDIUM: 2, MINOR: 3 };

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

  allFindings.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

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
