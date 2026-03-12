import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import JSZip from "jszip";
import { TestCategory, AnalysisIssue, GeneratedTest } from "./types";
import { mapIssuesToCategories } from "./categories";
import { MAESTRO_TEMPLATES, generateSuiteYaml } from "./maestro-templates";
import { DETOX_TEMPLATES } from "./detox-templates";

// ── Secrets (shared cache with analyze route) ───────────────

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || "us-east-1",
});

let cachedGeminiKey: string | null = null;

async function getGeminiKey(): Promise<string> {
  if (cachedGeminiKey) return cachedGeminiKey;
  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: "luminetic/gemini-api-key" })
  );
  const key = response.SecretString
    ? JSON.parse(response.SecretString).GEMINI_API_KEY
    : null;
  if (!key) throw new Error("Gemini API key not found in Secrets Manager");
  cachedGeminiKey = key;
  return key;
}

// ── Gemini customization ────────────────────────────────────

const CUSTOMIZATION_PROMPT = `You are a mobile test engineer. You will receive:
1. A list of test categories, each with a template containing {{placeholder}} markers
2. Analysis context describing the app's issues

Your job: fill in EVERY {{placeholder}} with realistic, app-specific values based on the analysis context.

Rules:
- Return ONLY valid JSON — no markdown, no backticks, no explanation
- The JSON must be an object where each key is the category name and the value is the completed template string with ALL placeholders replaced
- Use realistic UI text that would appear in an iOS app (e.g., "Settings", "Delete Account", "Sign In")
- If the analysis doesn't mention a specific UI element, use common iOS conventions
- The appId placeholder should be replaced with "{{APP_ID}}" (the developer will replace this)
- NEVER leave any {{placeholder}} markers in the output`;

interface CategoryContext {
  category: TestCategory;
  template: string;
  issues: AnalysisIssue[];
}

async function customizeTemplates(
  contexts: CategoryContext[],
  format: "maestro" | "detox"
): Promise<Map<TestCategory, string>> {
  const result = new Map<TestCategory, string>();

  try {
    const apiKey = await getGeminiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
    });

    const categoriesPayload = contexts.map((ctx) => ({
      category: ctx.category,
      template: ctx.template,
      issues: ctx.issues.map((i) => ({
        issue: i.issue,
        evidence: i.evidence,
        guideline: i.guideline_section,
      })),
    }));

    const prompt = `${CUSTOMIZATION_PROMPT}

Format: ${format.toUpperCase()}

Categories and templates:
${JSON.stringify(categoriesPayload, null, 2)}

Return a JSON object keyed by category name with the completed template strings.`;

    const response = await model.generateContent([{ text: prompt }]);
    const raw = response.response.text();
    const cleaned = raw.replace(/```json\s*|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, string>;

    for (const ctx of contexts) {
      const customized = parsed[ctx.category];
      if (customized && !customized.includes("{{")) {
        result.set(ctx.category, customized);
      } else {
        // Gemini left placeholders — use fallback
        result.set(ctx.category, applyDefaultPlaceholders(ctx.template));
      }
    }
  } catch (error) {
    console.error(`[test-gen] Gemini customization failed for ${format}:`, error);
    // Fall back to default placeholders for all
    for (const ctx of contexts) {
      result.set(ctx.category, applyDefaultPlaceholders(ctx.template));
    }
  }

  return result;
}

// ── Default placeholders (fallback) ─────────────────────────

const DEFAULT_VALUES: Record<string, string> = {
  "{{appId}}": "{{APP_ID}}",
  "{{mainScreenElement}}": "Home",
  "{{settingsOrPaywallText}}": "Settings",
  "{{restoreButtonText}}": "Restore Purchases",
  "{{restoreConfirmationText}}": "Purchases Restored",
  "{{subscriptionEntryText}}": "Upgrade",
  "{{priceDisplayText}}": "$",
  "{{termsText}}": "Terms",
  "{{profileOrSettingsText}}": "Settings",
  "{{deleteAccountText}}": "Delete Account",
  "{{confirmationDialogText}}": "Are you sure",
  "{{confirmDeleteText}}": "Delete",
  "{{postDeletionText}}": "Account Deleted",
  "{{accountSettingsText}}": "Account",
  "{{emailOrUsernameText}}": "Email",
  "{{settingsOrProfileText}}": "Settings",
  "{{privacyPolicyLinkText}}": "Privacy Policy",
  "{{privacyPolicyHeaderText}}": "Privacy",
  "{{attDialogText}}": "Allow",
  "{{allowTrackingText}}": "Allow",
  "{{deepLinkUrl}}": "myapp://home",
  "{{deepLinkDestinationText}}": "Home",
  "{{linkText}}": "Terms of Service",
  "{{linkDestinationText}}": "Terms",
  "{{loginScreenText}}": "Sign In",
  "{{emailFieldId}}": "email-input",
  "{{testEmail}}": "test@example.com",
  "{{passwordFieldId}}": "password-input",
  "{{testPassword}}": "TestPassword123!",
  "{{loginButtonText}}": "Sign In",
  "{{homeScreenText}}": "Home",
  "{{logoutButtonText}}": "Sign Out",
  "{{onboardingFirstScreenText}}": "Welcome",
  "{{nextButtonText}}": "Next",
  "{{onboardingSecondScreenText}}": "Get Started",
  "{{skipButtonText}}": "Skip",
  "{{mainScreenText}}": "Home",
  "{{tab1Text}}": "Home",
  "{{tab1ContentText}}": "Home",
  "{{tab2Text}}": "Search",
  "{{tab2ContentText}}": "Search",
  "{{tab3Text}}": "Profile",
  "{{tab3ContentText}}": "Profile",
  "{{navigateToScreenText}}": "Details",
  "{{detailScreenText}}": "Detail",
  "{{backButtonText}}": "Back",
  "{{previousScreenText}}": "Home",
  "{{networkDependentFeatureText}}": "Refresh",
  "{{offlineErrorText}}": "No Internet",
  "{{mainContentText}}": "Home",
  "{{settingsText}}": "Settings",
  "{{darkModeToggleText}}": "Dark Mode",
  "{{featureRequiringPermissionText}}": "Camera",
  "{{permissionDialogText}}": "Would Like to Access",
  "{{allowButtonText}}": "Allow",
  "{{signInWithAppleButtonText}}": "Sign in with Apple",
  "{{notificationPromptText}}": "Would Like to Send You Notifications",
  "{{allowNotificationsText}}": "Allow",
  "{{accessibilityCheckCondition}}": "true",
};

function applyDefaultPlaceholders(template: string): string {
  let result = template;
  for (const [placeholder, value] of Object.entries(DEFAULT_VALUES)) {
    result = result.replaceAll(placeholder, value);
  }
  return result;
}

// ── Validation ──────────────────────────────────────────────

function validateMaestroYaml(content: string): boolean {
  return (
    content.includes("launchApp") &&
    !content.includes("{{") &&
    content.length > 20
  );
}

function validateDetoxJs(content: string): boolean {
  return (
    content.includes("describe(") &&
    content.includes("it(") &&
    !content.includes("{{") &&
    content.length > 40
  );
}

// ── Main generator ──────────────────────────────────────────

export interface GenerateOptions {
  includeDetox: boolean;
  appId?: string;
}

export async function generateTests(
  issues: AnalysisIssue[],
  options: GenerateOptions
): Promise<{ tests: GeneratedTest[]; zipBuffer: Uint8Array }> {
  const categoryMap = mapIssuesToCategories(issues);

  if (categoryMap.size === 0) {
    throw new Error("No testable issues found in the analysis results.");
  }

  const tests: GeneratedTest[] = [];

  // Build contexts for Maestro
  const maestroContexts: CategoryContext[] = [];
  for (const [category, categoryIssues] of categoryMap) {
    maestroContexts.push({
      category,
      template: MAESTRO_TEMPLATES[category],
      issues: categoryIssues,
    });
  }

  // Customize Maestro templates via Gemini
  const maestroResults = await customizeTemplates(maestroContexts, "maestro");

  for (const [category, content] of maestroResults) {
    let finalContent = content;

    // Replace appId if provided
    if (options.appId) {
      finalContent = finalContent.replaceAll("{{APP_ID}}", options.appId);
    }

    if (validateMaestroYaml(finalContent)) {
      const issueDescs = categoryMap.get(category)!;
      tests.push({
        filename: `maestro/${category}.yaml`,
        content: finalContent,
        category,
        format: "maestro",
        issueDescription: issueDescs.map((i) => i.issue).join("; "),
      });
    }
  }

  // Detox if requested
  if (options.includeDetox) {
    const detoxContexts: CategoryContext[] = [];
    for (const [category, categoryIssues] of categoryMap) {
      detoxContexts.push({
        category,
        template: DETOX_TEMPLATES[category],
        issues: categoryIssues,
      });
    }

    const detoxResults = await customizeTemplates(detoxContexts, "detox");

    for (const [category, content] of detoxResults) {
      if (validateDetoxJs(content)) {
        const issueDescs = categoryMap.get(category)!;
        tests.push({
          filename: `detox/${category}.test.js`,
          content,
          category,
          format: "detox",
          issueDescription: issueDescs.map((i) => i.issue).join("; "),
        });
      }
    }
  }

  // Generate suite YAML
  const maestroFiles = tests
    .filter((t) => t.format === "maestro")
    .map((t) => t.filename.replace("maestro/", ""));
  const suiteYaml = generateSuiteYaml(maestroFiles);

  // Bundle into ZIP
  const zip = new JSZip();

  // Add maestro suite
  zip.file("maestro/maestro-suite.yaml", suiteYaml);

  // Add all test files
  for (const test of tests) {
    zip.file(test.filename, test.content);
  }

  // Add README
  zip.file(
    "README.md",
    `# Luminetic Test Suite

Generated by Luminetic · luminetic.io

## Maestro Tests
Run all tests:
\`\`\`bash
cd maestro
maestro test maestro-suite.yaml
\`\`\`

Run individual test:
\`\`\`bash
maestro test maestro/<test-name>.yaml
\`\`\`
${
  options.includeDetox
    ? `
## Detox Tests
\`\`\`bash
npx detox test detox/
\`\`\`
`
    : ""
}
## Important
- Replace \`{{APP_ID}}\` with your actual bundle identifier if not already set
- Review each test and adjust UI element text to match your app
- These tests are generated from your rejection analysis — customize as needed
`
  );

  const zipBuffer = await zip.generateAsync({ type: "uint8array" });

  return { tests, zipBuffer };
}
