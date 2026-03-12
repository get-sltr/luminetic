export type TestCategory =
  | "launch-stability"
  | "iap-restore"
  | "iap-flow"
  | "account-deletion"
  | "account-management"
  | "privacy-prompt"
  | "att-prompt"
  | "deep-links"
  | "url-reachability"
  | "login-flow"
  | "logout-flow"
  | "onboarding"
  | "navigation-tabs"
  | "back-navigation"
  | "no-network"
  | "dark-mode"
  | "permissions-usage"
  | "sign-in-with-apple"
  | "push-notification"
  | "dynamic-type";

export interface AnalysisIssue {
  severity: string;
  issue: string;
  evidence?: string;
  guideline_section?: string;
  source?: string;
}

export interface GeneratedTest {
  filename: string;
  content: string;
  category: TestCategory;
  format: "maestro" | "detox";
  issueDescription: string;
}

export interface GenerationResult {
  tests: GeneratedTest[];
  suiteYaml: string;
  downloadUrl: string;
  expiresAt: string;
  s3Key: string;
}
