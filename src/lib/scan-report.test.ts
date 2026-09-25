import { describe, expect, it } from "vitest";
import { isRenderableScanReport } from "./scan-report";

const readyReport = {
  guidelines: [],
  issues: [],
  action_plan: [],
  assessment: { score: 80, summary: "Ready", agreement_level: "partial" },
};

describe("isRenderableScanReport", () => {
  it("accepts a completed report", () => {
    expect(isRenderableScanReport(readyReport)).toBe(true);
  });

  it("rejects pending and failed scans that have no merged result", () => {
    expect(isRenderableScanReport(undefined)).toBe(false);
    expect(isRenderableScanReport(null)).toBe(false);
  });

  it("rejects a partial object that would crash the report view", () => {
    expect(isRenderableScanReport({ assessment: { score: 10 } })).toBe(false);
    expect(isRenderableScanReport({ ...readyReport, issues: undefined })).toBe(false);
    expect(isRenderableScanReport({ ...readyReport, assessment: { summary: "no score" } })).toBe(false);
  });
});
