import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class {},
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({ send: sendMock })),
  },
  ScanCommand: class {
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

describe("stuck-scan sweeper", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("does not refund when stuck scan did not charge credit", async () => {
    sendMock
      .mockResolvedValueOnce({
        Items: [{
          PK: "USER#user-1",
          SK: "SCAN#2026-01-01T00:00:00.000Z#scan-1",
          scanId: "scan-1",
          status: "analyzing",
          updatedAt: "2026-01-01T00:00:00.000Z",
          creditCharged: false,
        }],
      })
      .mockResolvedValueOnce({});

    const { handler } = await import("./index.mjs");
    const result = await handler();

    expect(result).toEqual({ swept: 1 });
    expect(sendMock).toHaveBeenCalledTimes(2);

    const callInputs = sendMock.mock.calls.map(([cmd]) => cmd.input);
    const profileUpdate = callInputs.find(
      (input: any) => input?.Key?.SK === "PROFILE"
    );
    expect(profileUpdate).toBeUndefined();
  });

  it("refunds when stuck scan charged a credit", async () => {
    sendMock
      .mockResolvedValueOnce({
        Items: [{
          PK: "USER#user-2",
          SK: "SCAN#2026-01-01T00:00:00.000Z#scan-2",
          scanId: "scan-2",
          status: "reconciling",
          updatedAt: "2026-01-01T00:00:00.000Z",
          creditCharged: true,
        }],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const { handler } = await import("./index.mjs");
    const result = await handler();

    expect(result).toEqual({ swept: 1 });
    expect(sendMock).toHaveBeenCalledTimes(3);

    const callInputs = sendMock.mock.calls.map(([cmd]) => cmd.input);
    const profileUpdates = callInputs.filter(
      (input: any) => input?.Key?.SK === "PROFILE"
    );
    expect(profileUpdates).toHaveLength(1);
  });
});
