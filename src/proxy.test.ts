import { describe, expect, it } from "vitest";
import { isPublicPath } from "./proxy";

describe("isPublicPath", () => {
  it("allows the marketing blog and legal pages without a session", () => {
    expect(isPublicPath("/blog")).toBe(true);
    expect(isPublicPath("/blog/why-most-apps-fail-app-store-review")).toBe(true);
    expect(isPublicPath("/blog/why-most-apps-fail-app-store-review/opengraph-image")).toBe(true);
    expect(isPublicPath("/terms")).toBe(true);
  });

  it("still requires a session for app pages", () => {
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/history")).toBe(false);
    expect(isPublicPath("/analyze")).toBe(false);
    expect(isPublicPath("/blogger")).toBe(false);
    expect(isPublicPath("/terms-extra")).toBe(false);
  });

  it("keeps auth and webhook endpoints reachable", () => {
    expect(isPublicPath("/api/auth/login")).toBe(true);
    expect(isPublicPath("/api/webhooks/square")).toBe(true);
    expect(isPublicPath("/api/analyze-stream")).toBe(false);
  });
});
