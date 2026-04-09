import { describe, it, expect, vi, beforeEach } from "vitest";
import { db, canUserScan, claimFreeScan } from "./db";

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class {},
}));

vi.mock("@aws-sdk/lib-dynamodb", () => {
  class MockDocClient {
    send = vi.fn();
  }
  return {
    DynamoDBDocumentClient: { from: () => new MockDocClient() },
    PutCommand: class {},
    GetCommand: class {},
    QueryCommand: class {},
    UpdateCommand: class {},
    ScanCommand: class {},
  };
});

describe("db scan gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks free scans once free scan is already claimed", async () => {
    vi.mocked(db.send).mockResolvedValueOnce({
      Item: { scanCredits: 0, scanCount: 0, freeScanClaimedAt: "2026-04-01T00:00:00.000Z", plan: "free", role: "user" },
    } as never);

    const gate = await canUserScan("user-1");
    expect(gate.allowed).toBe(false);
    expect(gate.isFreeScan).toBe(false);
  });

  it("returns false when free scan claim condition fails", async () => {
    vi.mocked(db.send).mockRejectedValueOnce(new Error("ConditionalCheckFailedException"));
    const claimed = await claimFreeScan("user-1");
    expect(claimed).toBe(false);
  });
});
