// Classify size failures without hiding quota, network or application errors.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { transact } = vi.hoisted(() => ({ transact: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/firebaseAdmin", () => ({ adminDb: { runTransaction: transact } }));
const { runTransaction } = await import("@/server/data/util");
const { ApiError } = await import("@/lib/api/core");

beforeEach(() => {
  transact.mockReset();
});

describe("transaction failures", () => {
  it.each([
    [3, "maximum entity size is 1048576 bytes"],
    [3, "Request payload too large"],
    [9, "Transaction too big. Decrease transaction size."],
  ])("returns a conflict for a Firestore size failure (%s, %s)", async (code, message) => {
    transact.mockRejectedValue(Object.assign(new Error(message), { code }));
    await expect(runTransaction(async () => undefined)).rejects.toMatchObject({ code: "conflict", status: 409 });
  });

  it("preserves successful results and delegates the callback", async () => {
    const callback = async () => 42;
    transact.mockResolvedValue(42);
    expect(await runTransaction(callback)).toBe(42);
    expect(transact).toHaveBeenCalledWith(callback);
  });

  it.each([
    Object.assign(new Error("Index required"), { code: 9 }),
    Object.assign(new Error("Quota exceeded"), { code: 8 }),
    Object.assign(new Error("Unavailable"), { code: 14 }),
    new ApiError("forbidden", "Not allowed"),
    new Error("Unexpected bug"),
  ])("preserves unrelated errors: %s", async (error) => {
    transact.mockRejectedValue(error);
    await expect(runTransaction(async () => undefined)).rejects.toBe(error);
  });
});
