import { beforeEach, describe, expect, it, vi } from "vitest";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class DynamoDBClient {},
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: { from: () => ({ send }) },
  PutCommand: class PutCommand { constructor(public input: unknown) {} },
  GetCommand: class GetCommand { constructor(public input: unknown) {} },
  QueryCommand: class QueryCommand { constructor(public input: Record<string, unknown>) {} },
  UpdateCommand: class UpdateCommand { constructor(public input: unknown) {} },
  ScanCommand: class ScanCommand { constructor(public input: unknown) {} },
}));

import { getAllScansWithIssues, getScan, getScans } from "./db";

function queryInput(call: number): Record<string, unknown> {
  return send.mock.calls[call][0].input as Record<string, unknown>;
}

describe("scan queries follow DynamoDB pagination", () => {
  beforeEach(() => {
    send.mockReset();
  });

  it("returns a scan that is only present after the first 1MB page", async () => {
    send
      .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: { PK: "USER#u1", SK: "SCAN#page1" } })
      .mockResolvedValueOnce({ Items: [{ scanId: "new-scan", status: "complete", score: 80 }] });

    const scan = await getScan("u1", "new-scan");

    expect(scan).toEqual({ scanId: "new-scan", status: "complete", score: 80 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(queryInput(0).ExclusiveStartKey).toBeUndefined();
    expect(queryInput(1).ExclusiveStartKey).toEqual({ PK: "USER#u1", SK: "SCAN#page1" });
    expect(queryInput(0).ScanIndexForward).toBe(false);
    expect(queryInput(0).FilterExpression).toBe("scanId = :sid");
    expect(queryInput(0).Limit).toBeUndefined();
  });

  it("stops paging once the scan is found", async () => {
    send.mockResolvedValueOnce({
      Items: [{ scanId: "latest", status: "complete" }],
      LastEvaluatedKey: { PK: "USER#u1", SK: "SCAN#older" },
    });

    await expect(getScan("u1", "latest")).resolves.toEqual({ scanId: "latest", status: "complete" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("returns null when every page is exhausted", async () => {
    send
      .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: { PK: "USER#u1", SK: "SCAN#page1" } })
      .mockResolvedValueOnce({ Items: [] });

    await expect(getScan("u1", "missing")).resolves.toBeNull();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("keeps reading history pages so reports past 1MB stay listed", async () => {
    send
      .mockResolvedValueOnce({
        Items: [{ scanId: "newer" }],
        LastEvaluatedKey: { PK: "USER#u1", SK: "SCAN#mid" },
      })
      .mockResolvedValueOnce({ Items: [{ scanId: "older" }] });

    await expect(getAllScansWithIssues("u1")).resolves.toEqual([
      { scanId: "newer" },
      { scanId: "older" },
    ]);
    expect(queryInput(1).ExclusiveStartKey).toEqual({ PK: "USER#u1", SK: "SCAN#mid" });
  });

  it("fills the requested scan list across pages", async () => {
    send
      .mockResolvedValueOnce({
        Items: [{ scanId: "a" }],
        LastEvaluatedKey: { PK: "USER#u1", SK: "SCAN#a" },
      })
      .mockResolvedValueOnce({ Items: [{ scanId: "b" }, { scanId: "c" }] });

    await expect(getScans("u1", 3)).resolves.toEqual([
      { scanId: "a" },
      { scanId: "b" },
      { scanId: "c" },
    ]);
    expect(queryInput(1).Limit).toBe(2);
    expect(queryInput(1).ExclusiveStartKey).toEqual({ PK: "USER#u1", SK: "SCAN#a" });
  });
});
