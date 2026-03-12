import { TestCategory } from "./types";

export const DETOX_TEMPLATES: Record<TestCategory, string> = {
  "launch-stability": `describe('Launch Stability', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should launch without crashing', async () => {
    await expect(element(by.text('{{mainScreenElement}}'))).toBeVisible();
  });

  it('should survive background/foreground cycle', async () => {
    await device.sendToHome();
    await device.launchApp({ newInstance: false });
    await expect(element(by.text('{{mainScreenElement}}'))).toBeVisible();
  });
});`,

  "iap-restore": `describe('Restore Purchases', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should navigate to restore purchases', async () => {
    await element(by.text('{{settingsOrPaywallText}}')).tap();
    await expect(element(by.text('{{restoreButtonText}}'))).toBeVisible();
  });

  it('should tap restore and show confirmation', async () => {
    await element(by.text('{{restoreButtonText}}')).tap();
    await waitFor(element(by.text('{{restoreConfirmationText}}')))
      .toBeVisible()
      .withTimeout(10000);
  });
});`,

  "iap-flow": `describe('In-App Purchase Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should display subscription options', async () => {
    await element(by.text('{{subscriptionEntryText}}')).tap();
    await expect(element(by.text('{{priceDisplayText}}'))).toBeVisible();
  });

  it('should show terms and conditions', async () => {
    await expect(element(by.text('{{termsText}}'))).toBeVisible();
  });
});`,

  "account-deletion": `describe('Account Deletion', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should navigate to delete account', async () => {
    await element(by.text('{{profileOrSettingsText}}')).tap();
    await expect(element(by.text('{{deleteAccountText}}'))).toBeVisible();
  });

  it('should show confirmation before deleting', async () => {
    await element(by.text('{{deleteAccountText}}')).tap();
    await expect(element(by.text('{{confirmationDialogText}}'))).toBeVisible();
  });

  it('should complete deletion flow', async () => {
    await element(by.text('{{confirmDeleteText}}')).tap();
    await waitFor(element(by.text('{{postDeletionText}}')))
      .toBeVisible()
      .withTimeout(5000);
  });
});`,

  "account-management": `describe('Account Management', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should display account settings', async () => {
    await element(by.text('{{profileOrSettingsText}}')).tap();
    await expect(element(by.text('{{accountSettingsText}}'))).toBeVisible();
    await expect(element(by.text('{{emailOrUsernameText}}'))).toBeVisible();
  });
});`,

  "privacy-prompt": `describe('Privacy Policy', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should have accessible privacy policy', async () => {
    await element(by.text('{{settingsOrProfileText}}')).tap();
    await element(by.text('{{privacyPolicyLinkText}}')).tap();
    await waitFor(element(by.text('{{privacyPolicyHeaderText}}')))
      .toBeVisible()
      .withTimeout(5000);
  });
});`,

  "att-prompt": `describe('App Tracking Transparency', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true });
  });

  it('should show ATT dialog before tracking', async () => {
    await waitFor(element(by.text('{{attDialogText}}')))
      .toBeVisible()
      .withTimeout(5000);
  });
});`,

  "deep-links": `describe('Deep Links', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should handle deep link navigation', async () => {
    await device.openURL({ url: '{{deepLinkUrl}}' });
    await waitFor(element(by.text('{{deepLinkDestinationText}}')))
      .toBeVisible()
      .withTimeout(5000);
  });
});`,

  "url-reachability": `describe('URL Reachability', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should open link successfully', async () => {
    await element(by.text('{{linkText}}')).tap();
    await waitFor(element(by.text('{{linkDestinationText}}')))
      .toBeVisible()
      .withTimeout(10000);
  });
});`,

  "login-flow": `describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true });
  });

  it('should complete login successfully', async () => {
    await expect(element(by.text('{{loginScreenText}}'))).toBeVisible();
    await element(by.id('{{emailFieldId}}')).typeText('{{testEmail}}');
    await element(by.id('{{passwordFieldId}}')).typeText('{{testPassword}}');
    await element(by.text('{{loginButtonText}}')).tap();
    await waitFor(element(by.text('{{homeScreenText}}')))
      .toBeVisible()
      .withTimeout(10000);
  });
});`,

  "logout-flow": `describe('Logout Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should complete logout successfully', async () => {
    await element(by.text('{{profileOrSettingsText}}')).tap();
    await element(by.text('{{logoutButtonText}}')).tap();
    await waitFor(element(by.text('{{loginScreenText}}')))
      .toBeVisible()
      .withTimeout(5000);
  });
});`,

  "onboarding": `describe('Onboarding', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true });
  });

  it('should complete onboarding flow', async () => {
    await expect(element(by.text('{{onboardingFirstScreenText}}'))).toBeVisible();
    await element(by.text('{{nextButtonText}}')).tap();
    await expect(element(by.text('{{onboardingSecondScreenText}}'))).toBeVisible();
  });

  it('should allow skipping onboarding', async () => {
    await element(by.text('{{skipButtonText}}')).tap();
    await waitFor(element(by.text('{{mainScreenText}}')))
      .toBeVisible()
      .withTimeout(5000);
  });
});`,

  "navigation-tabs": `describe('Navigation Tabs', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should navigate between all tabs', async () => {
    await element(by.text('{{tab1Text}}')).tap();
    await expect(element(by.text('{{tab1ContentText}}'))).toBeVisible();
    await element(by.text('{{tab2Text}}')).tap();
    await expect(element(by.text('{{tab2ContentText}}'))).toBeVisible();
    await element(by.text('{{tab3Text}}')).tap();
    await expect(element(by.text('{{tab3ContentText}}'))).toBeVisible();
  });
});`,

  "back-navigation": `describe('Back Navigation', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should navigate back correctly', async () => {
    await element(by.text('{{navigateToScreenText}}')).tap();
    await expect(element(by.text('{{detailScreenText}}'))).toBeVisible();
    await element(by.text('{{backButtonText}}')).tap();
    await expect(element(by.text('{{previousScreenText}}'))).toBeVisible();
  });
});`,

  "no-network": `describe('Offline Handling', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should handle no network gracefully', async () => {
    await device.setURLBlacklist(['.*']);
    await element(by.text('{{networkDependentFeatureText}}')).tap();
    await waitFor(element(by.text('{{offlineErrorText}}')))
      .toBeVisible()
      .withTimeout(5000);
    await device.setURLBlacklist([]);
  });
});`,

  "dark-mode": `describe('Dark Mode', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should render correctly in dark mode', async () => {
    await expect(element(by.text('{{mainContentText}}'))).toBeVisible();
  });
});`,

  "permissions-usage": `describe('Permission Requests', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true });
  });

  it('should request permission before accessing feature', async () => {
    await element(by.text('{{featureRequiringPermissionText}}')).tap();
    await waitFor(element(by.text('{{permissionDialogText}}')))
      .toBeVisible()
      .withTimeout(3000);
  });
});`,

  "sign-in-with-apple": `describe('Sign in with Apple', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true });
  });

  it('should show Sign in with Apple option', async () => {
    await expect(element(by.text('{{loginScreenText}}'))).toBeVisible();
    await expect(element(by.text('{{signInWithAppleButtonText}}'))).toBeVisible();
  });
});`,

  "push-notification": `describe('Push Notification Consent', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true });
  });

  it('should request notification permission', async () => {
    await waitFor(element(by.text('{{notificationPromptText}}')))
      .toBeVisible()
      .withTimeout(5000);
  });
});`,

  "dynamic-type": `describe('Dynamic Type & Accessibility', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should render content visibly', async () => {
    await expect(element(by.text('{{mainContentText}}'))).toBeVisible();
  });
});`,
};
