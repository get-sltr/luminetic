import { describe, it, expect, beforeEach } from "vitest";
import { nextFindingId, resetFindingCounter } from "./types";

describe("Finding ID generation", () => {
  beforeEach(() => {
    resetFindingCounter();
  });

  it("generates sequential IDs with prefix", () => {
    expect(nextFindingId("SA")).toBe("SA-001");
    expect(nextFindingId("SA")).toBe("SA-002");
    expect(nextFindingId("PV")).toBe("PV-003");
  });

  it("resets counter", () => {
    nextFindingId("SA");
    nextFindingId("SA");
    resetFindingCounter();
    expect(nextFindingId("SA")).toBe("SA-001");
  });
});
