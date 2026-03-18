import { describe, it, expect } from "vitest";
import { SCAN_PACKS, SQUARE_LOCATION_ID, SQUARE_APP_ID } from "./square";

describe("Square config", () => {
  it("has correct scan pack definitions", () => {
    expect(SCAN_PACKS).toHaveLength(3);

    const starter = SCAN_PACKS.find((p) => p.id === "starter");
    expect(starter).toBeDefined();
    expect(starter!.scans).toBe(1);
    expect(starter!.priceInCents).toBe(1500);

    const pro = SCAN_PACKS.find((p) => p.id === "pro");
    expect(pro).toBeDefined();
    expect(pro!.scans).toBe(3);
    expect(pro!.priceInCents).toBe(4000);

    const agency = SCAN_PACKS.find((p) => p.id === "agency");
    expect(agency).toBeDefined();
    expect(agency!.scans).toBe(10);
    expect(agency!.priceInCents).toBe(14900);
  });

  it("all packs have positive prices", () => {
    for (const pack of SCAN_PACKS) {
      expect(pack.priceInCents).toBeGreaterThan(0);
      expect(pack.scans).toBeGreaterThan(0);
    }
  });

  it("pack IDs are unique", () => {
    const ids = SCAN_PACKS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("exports Square location and app IDs", () => {
    expect(SQUARE_LOCATION_ID).toBeTruthy();
    expect(SQUARE_APP_ID).toBeTruthy();
  });
});
