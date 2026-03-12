import { TestCategory, AnalysisIssue } from "./types";

interface CategoryMatcher {
  category: TestCategory;
  keywords: string[];
  guidelineSections: string[];
}

const CATEGORY_MATCHERS: CategoryMatcher[] = [
  {
    category: "launch-stability",
    keywords: ["crash", "launch", "startup", "hang", "unresponsive", "crash on launch", "cold start", "warm start"],
    guidelineSections: ["2.1"],
  },
  {
    category: "iap-restore",
    keywords: ["restore purchase", "restore button", "restore subscription"],
    guidelineSections: ["3.1.1", "3.1.2"],
  },
  {
    category: "iap-flow",
    keywords: ["in-app purchase", "subscription", "payment", "iap", "storekit", "auto-renewable"],
    guidelineSections: ["3.1", "3.1.3", "3.1.4"],
  },
  {
    category: "account-deletion",
    keywords: ["account deletion", "delete account", "delete data", "account removal"],
    guidelineSections: ["5.1.1"],
  },
  {
    category: "account-management",
    keywords: ["account recovery", "forgot password", "reset password", "account settings"],
    guidelineSections: ["5.1.1", "5.1.2"],
  },
  {
    category: "privacy-prompt",
    keywords: ["privacy policy", "privacy link", "data collection", "data handling"],
    guidelineSections: ["5.1", "5.1.2"],
  },
  {
    category: "att-prompt",
    keywords: ["app tracking", "att", "idfa", "tracking transparency"],
    guidelineSections: ["5.1.2"],
  },
  {
    category: "sign-in-with-apple",
    keywords: ["sign in with apple", "apple sign in", "third-party login", "social login"],
    guidelineSections: ["4.8"],
  },
  {
    category: "login-flow",
    keywords: ["login", "sign in", "authentication", "credentials", "demo account"],
    guidelineSections: ["2.1"],
  },
  {
    category: "logout-flow",
    keywords: ["logout", "sign out", "log out"],
    guidelineSections: [],
  },
  {
    category: "onboarding",
    keywords: ["onboarding", "walkthrough", "tutorial", "first launch", "skip"],
    guidelineSections: [],
  },
  {
    category: "navigation-tabs",
    keywords: ["tab bar", "navigation tab", "bottom tab", "all tabs"],
    guidelineSections: [],
  },
  {
    category: "back-navigation",
    keywords: ["back button", "back navigation", "navigate back", "swipe back"],
    guidelineSections: [],
  },
  {
    category: "no-network",
    keywords: ["no network", "offline", "network error", "no internet", "airplane mode"],
    guidelineSections: [],
  },
  {
    category: "dark-mode",
    keywords: ["dark mode", "dark appearance", "invisible text", "contrast"],
    guidelineSections: [],
  },
  {
    category: "permissions-usage",
    keywords: ["permission", "camera", "location", "microphone", "photo library", "purpose string", "usage description"],
    guidelineSections: ["5.1", "5.1.1"],
  },
  {
    category: "deep-links",
    keywords: ["deep link", "universal link", "url scheme", "custom url"],
    guidelineSections: [],
  },
  {
    category: "url-reachability",
    keywords: ["url", "link", "broken link", "404", "reachable", "terms of service", "support url"],
    guidelineSections: [],
  },
  {
    category: "push-notification",
    keywords: ["push notification", "notification permission", "remote notification"],
    guidelineSections: [],
  },
  {
    category: "dynamic-type",
    keywords: ["dynamic type", "accessibility", "font size", "text scaling", "voiceover"],
    guidelineSections: [],
  },
];

export function mapIssuesToCategories(issues: AnalysisIssue[]): Map<TestCategory, AnalysisIssue[]> {
  const result = new Map<TestCategory, AnalysisIssue[]>();

  for (const issue of issues) {
    const text = issue.issue.toLowerCase();
    const section = issue.guideline_section || "";

    for (const matcher of CATEGORY_MATCHERS) {
      const keywordMatch = matcher.keywords.some((kw) => text.includes(kw));
      const sectionMatch = matcher.guidelineSections.some(
        (s) => section === s || section.startsWith(s + ".")
      );

      if (keywordMatch || sectionMatch) {
        const existing = result.get(matcher.category) || [];
        existing.push(issue);
        result.set(matcher.category, existing);
        break; // first match wins
      }
    }
  }

  return result;
}
