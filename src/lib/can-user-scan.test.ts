import { beforeEach, describe, expect, it, vi } from "vitest";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class DynamoDBClient {},
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: { from: () => ({ send }) },
  PutCommand: class PutCommand {},
  GetCommand: class GetCommand {},
  QueryCommand: class QueryCommand {},
  UpdateCommand: class UpdateCommand {},
  ScanCommand: class ScanCommand {},
}));

import { canUserScan } from "./db";
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

describe("canUserScan", () => {
  beforeEach(() => {
    send.mockReset();
  });

  it("allows a free scan only when the account has no scan row yet", async () => {
    send.mockImplementation(async (command: unknown) => {
      if (command instanceof GetCommand) {
        return { Item: { scanCredits: 0, scanCount: 0, role: "user", plan: "free" } };
      }
      if (command instanceof QueryCommand) {
        return { Items: [] };
      }
      throw new Error("unexpected command");
    });

    await expect(canUserScan("user-1")).resolves.toMatchObject({
      allowed: true,
      isFreeScan: true,
      isPaidScan: false,
    });
  });

  it("does not grant another free scan after the last credit already created a scan", async () => {
    send.mockImplementation(async (command: unknown) => {
      if (command instanceof GetCommand) {
        return { Item: { scanCredits: 0, scanCount: 0, role: "user", plan: "free" } };
      }
      if (command instanceof QueryCommand) {
        return { Items: [{ scanId: "scan-1" }] };
      }
      throw new Error("unexpected command");
    });

    await expect(canUserScan("user-1")).resolves.toMatchObject({
      allowed: false,
      isFreeScan: false,
      reason: "No scan credits remaining.",
    });
  });

  it("still blocks accounts that have finished a scan and have no credits", async () => {
    send.mockImplementation(async (command: unknown) => {
      if (command instanceof GetCommand) {
        return { Item: { scanCredits: 0, scanCount: 1, role: "user", plan: "free" } };
      }
      throw new Error("unexpected command");
    });

    await expect(canUserScan("user-1")).resolves.toMatchObject({
      allowed: false,
      isFreeScan: false,
    });
    expect(send).toHaveBeenCalledTimes(1);
  });
});
