import { describe, expect, it } from "vitest";
import { appShellPricingRedirect } from "./app-shell-access";

describe("appShellPricingRedirect", () => {
  it("keeps a user in the app after the last credit is spent on a finished scan", () => {
    expect(appShellPricingRedirect({ role: "user", credits: 0, scanCount: 1 })).toBeNull();
  });

  it("keeps a user in the app while their only scan is still in progress", () => {
    // Credit is deducted at start; scanCount increments only when the Lambda finishes.
    expect(appShellPricingRedirect({ role: "user", credits: 0, scanCount: 0 })).toBeNull();
  });

  it("does not redirect founders or users who still have credits", () => {
    expect(appShellPricingRedirect({ role: "founder", credits: 0, scanCount: 4 })).toBeNull();
    expect(appShellPricingRedirect({ role: "admin", credits: 0, scanCount: 4 })).toBeNull();
    expect(appShellPricingRedirect({ role: "user", credits: 2, scanCount: 3 })).toBeNull();
  });
});
