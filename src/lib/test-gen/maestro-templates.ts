import { TestCategory } from "./types";

export const MAESTRO_TEMPLATES: Record<TestCategory, string> = {
  "launch-stability": `appId: {{appId}}
---
- launchApp
- assertVisible:
    text: "{{mainScreenElement}}"
    timeout: 5000
- pressKey: home
- launchApp
- assertVisible:
    text: "{{mainScreenElement}}"
    timeout: 5000`,

  "iap-restore": `appId: {{appId}}
---
- launchApp
- tapOn:
    text: "{{settingsOrPaywallText}}"
- tapOn:
    text: "{{restoreButtonText}}"
- assertVisible:
    text: "{{restoreConfirmationText}}"
    timeout: 10000`,

  "iap-flow": `appId: {{appId}}
---
- launchApp
- tapOn:
    text: "{{subscriptionEntryText}}"
- assertVisible:
    text: "{{priceDisplayText}}"
- assertVisible:
    text: "{{termsText}}"`,

  "account-deletion": `appId: {{appId}}
---
- launchApp
- tapOn:
    text: "{{profileOrSettingsText}}"
- tapOn:
    text: "{{deleteAccountText}}"
- assertVisible:
    text: "{{confirmationDialogText}}"
- tapOn:
    text: "{{confirmDeleteText}}"
- assertVisible:
    text: "{{postDeletionText}}"
    timeout: 5000`,

  "account-management": `appId: {{appId}}
---
- launchApp
- tapOn:
    text: "{{profileOrSettingsText}}"
- assertVisible:
    text: "{{accountSettingsText}}"
- assertVisible:
    text: "{{emailOrUsernameText}}"`,

  "privacy-prompt": `appId: {{appId}}
---
- launchApp
- tapOn:
    text: "{{settingsOrProfileText}}"
- tapOn:
    text: "{{privacyPolicyLinkText}}"
- assertVisible:
    text: "{{privacyPolicyHeaderText}}"
    timeout: 5000`,

  "att-prompt": `appId: {{appId}}
---
- launchApp:
    clearState: true
- assertVisible:
    text: "{{attDialogText}}"
    timeout: 5000
- tapOn:
    text: "{{allowTrackingText}}"`,

  "deep-links": `appId: {{appId}}
---
- launchApp
- openLink: "{{deepLinkUrl}}"
- assertVisible:
    text: "{{deepLinkDestinationText}}"
    timeout: 5000`,

  "url-reachability": `appId: {{appId}}
---
- launchApp
- tapOn:
    text: "{{linkText}}"
- assertVisible:
    text: "{{linkDestinationText}}"
    timeout: 10000`,

  "login-flow": `appId: {{appId}}
---
- launchApp:
    clearState: true
- assertVisible:
    text: "{{loginScreenText}}"
- tapOn:
    id: "{{emailFieldId}}"
- inputText: "{{testEmail}}"
- tapOn:
    id: "{{passwordFieldId}}"
- inputText: "{{testPassword}}"
- tapOn:
    text: "{{loginButtonText}}"
- assertVisible:
    text: "{{homeScreenText}}"
    timeout: 10000`,

  "logout-flow": `appId: {{appId}}
---
- launchApp
- tapOn:
    text: "{{profileOrSettingsText}}"
- tapOn:
    text: "{{logoutButtonText}}"
- assertVisible:
    text: "{{loginScreenText}}"
    timeout: 5000`,

  "onboarding": `appId: {{appId}}
---
- launchApp:
    clearState: true
- assertVisible:
    text: "{{onboardingFirstScreenText}}"
- tapOn:
    text: "{{nextButtonText}}"
- assertVisible:
    text: "{{onboardingSecondScreenText}}"
- tapOn:
    text: "{{skipButtonText}}"
- assertVisible:
    text: "{{mainScreenText}}"
    timeout: 5000`,

  "navigation-tabs": `appId: {{appId}}
---
- launchApp
- tapOn:
    text: "{{tab1Text}}"
- assertVisible:
    text: "{{tab1ContentText}}"
- tapOn:
    text: "{{tab2Text}}"
- assertVisible:
    text: "{{tab2ContentText}}"
- tapOn:
    text: "{{tab3Text}}"
- assertVisible:
    text: "{{tab3ContentText}}"`,

  "back-navigation": `appId: {{appId}}
---
- launchApp
- tapOn:
    text: "{{navigateToScreenText}}"
- assertVisible:
    text: "{{detailScreenText}}"
- tapOn:
    text: "{{backButtonText}}"
- assertVisible:
    text: "{{previousScreenText}}"`,

  "no-network": `appId: {{appId}}
---
- launchApp
- setAirplaneMode:
    enabled: true
- tapOn:
    text: "{{networkDependentFeatureText}}"
- assertVisible:
    text: "{{offlineErrorText}}"
    timeout: 5000
- setAirplaneMode:
    enabled: false`,

  "dark-mode": `appId: {{appId}}
---
- launchApp
- assertVisible:
    text: "{{mainContentText}}"
- tapOn:
    text: "{{settingsText}}"
- assertVisible:
    text: "{{darkModeToggleText}}"`,

  "permissions-usage": `appId: {{appId}}
---
- launchApp:
    clearState: true
- tapOn:
    text: "{{featureRequiringPermissionText}}"
- assertVisible:
    text: "{{permissionDialogText}}"
    timeout: 3000
- tapOn:
    text: "{{allowButtonText}}"`,

  "sign-in-with-apple": `appId: {{appId}}
---
- launchApp:
    clearState: true
- assertVisible:
    text: "{{loginScreenText}}"
- assertVisible:
    text: "{{signInWithAppleButtonText}}"
- tapOn:
    text: "{{signInWithAppleButtonText}}"`,

  "push-notification": `appId: {{appId}}
---
- launchApp:
    clearState: true
- assertVisible:
    text: "{{notificationPromptText}}"
    timeout: 5000
- tapOn:
    text: "{{allowNotificationsText}}"`,

  "dynamic-type": `appId: {{appId}}
---
- launchApp
- assertVisible:
    text: "{{mainContentText}}"
- assertTrue:
    condition: "{{accessibilityCheckCondition}}"`,
};

export function generateSuiteYaml(filenames: string[]): string {
  const flows = filenames.map((f) => `  - ${f}`).join("\n");
  return `# Luminetic Generated Test Suite
# Run with: maestro test maestro-suite.yaml

flows:
${flows}
`;
}
