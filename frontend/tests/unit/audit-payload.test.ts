import { FieldValue, Firestore, GeoPoint, Timestamp } from "firebase-admin/firestore";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { canInlineAuditData, decodeAuditData, encodeAuditData } = await import("@/server/data/auditPayload");
const db = new Firestore({ projectId: "demo-audit-codec" });
const roundTrip = (value: unknown) => decodeAuditData(encodeAuditData(value), db);

describe("audit payload encoding", () => {
  it("preserves Unicode, nested containers, null and encoding-like document fields", () => {
    const value = {
      name: "漢字 🏆", missing: null, present: false, count: 17,
      nested: [{ type: "timestamp", seconds: 12 }, ["timestamp", 1, 2]],
      emptyMap: {}, emptyArray: [],
      ...JSON.parse('{"__proto__":{"polluted":true}}'),
    };
    expect(roundTrip(value)).toEqual(value);
    expect(Object.hasOwn(roundTrip(value) as object, "__proto__")).toBe(true);
    expect(Object.hasOwn(Object.prototype, "polluted")).toBe(false);
  });

  it("preserves Firestore timestamps, references, bytes, geographic points and vectors", () => {
    const timestamp = new Timestamp(1_800_000_000, 123_456_789);
    const reference = db.doc("users/example@yale.edu");
    const point = new GeoPoint(41.3, -72.9);
    const vector = FieldValue.vector([-0, 2, 3]);
    const value = { timestamp, reference, point, vector, bytes: Buffer.from([0, 255, 13]) };
    const decoded = roundTrip(value) as typeof value;
    expect(decoded.timestamp.isEqual(timestamp)).toBe(true);
    expect(decoded.reference.isEqual(reference)).toBe(true);
    expect(decoded.point.isEqual(point)).toBe(true);
    expect(decoded.vector.isEqual(vector)).toBe(true);
    expect(Object.is(decoded.vector.toArray()[0], -0)).toBe(true);
    expect(decoded.bytes).toEqual(value.bytes);
  });

  it("preserves dates, large integers and special numeric values", () => {
    const value = { date: new Date("2026-11-03T12:00:00Z"), integer: BigInt("9223372036854775807"), numbers: [NaN, Infinity, -Infinity, -0] };
    expect(roundTrip(value)).toEqual(value);
  });

  it("moves deeply nested values out of inline Firestore maps", () => {
    let nested: unknown = "value";
    for (let i = 0; i < 18; i++) nested = { next: nested };
    expect(canInlineAuditData({ before: { path: nested } })).toBe(false);
    expect(roundTrip(nested)).toEqual(nested);
    expect(canInlineAuditData({ before: { path: { at: Timestamp.now() } } })).toBe(true);
  });
});
