import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class {},
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: () => ({ send: mocks.send }),
  },
  GetCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
  PutCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
  QueryCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
  ScanCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
  TransactWriteCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
  UpdateCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

import { canUserScan, deductScanCredit, reserveFreeScan } from "./db";

describe("scan credit reservations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks the free scan path while a first scan is already reserved", async () => {
    mocks.send.mockResolvedValueOnce({
      Item: {
        userId: "user-1",
        scanCredits: 0,
        scanCount: 0,
        scanReservations: 1,
      },
    });

    const gate = await canUserScan("user-1");

    expect(gate.allowed).toBe(false);
    expect(gate.isFreeScan).toBe(false);
  });

  it("reserves an in-flight scan when deducting a paid credit", async () => {
    mocks.send.mockResolvedValueOnce({});

    const deducted = await deductScanCredit("user-1");

    expect(deducted).toBe(true);
    const command = mocks.send.mock.calls[0][0];
    expect(command.input.UpdateExpression).toContain("scanReservations :inc");
    expect(command.input.ExpressionAttributeValues).toMatchObject({
      ":dec": -1,
      ":inc": 1,
    });
  });

  it("only reserves a free scan when there are no prior or in-flight scans", async () => {
    mocks.send.mockResolvedValueOnce({});

    const reserved = await reserveFreeScan("user-1");

    expect(reserved).toBe(true);
    const command = mocks.send.mock.calls[0][0];
    expect(command.input.ConditionExpression).toContain("scanReservations");
    expect(command.input.ConditionExpression).toContain("scanCount");
    expect(command.input.ConditionExpression).toContain("scanCredits");
  });
});
