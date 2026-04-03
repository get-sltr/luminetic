import type { IpaMetadata } from "../ipa-parser";
import type { AnalyzerResult } from "./types";

export function analyzeAssets(metadata: IpaMetadata): AnalyzerResult {
  // Asset catalog (Assets.car) parsing requires native tools not available in Lambda.
  // Launch storyboard check is handled by build-config-analyzer.
  // This analyzer is a placeholder for Phase 4+ when Device Farm provides screenshot analysis.
  return { analyzer: "assets", findings: [] };
}
