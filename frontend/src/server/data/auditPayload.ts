// The versioned JSON encoding of large audit payloads. Every container is
// tagged, so document fields cannot be mistaken for encoding metadata.
// Firestore values keep their types, including timestamp nanoseconds. This
// uses only public SDK APIs; small audit entries still store native values.
import "server-only";
import { DocumentReference, FieldValue, GeoPoint, Timestamp, type Firestore } from "firebase-admin/firestore";

export const AUDIT_INLINE_BYTES = 64 * 1024;
export const AUDIT_CHUNK_BYTES = 256 * 1024;
export const AUDIT_MAX_BYTES = 2 * 1024 * 1024;
export const AUDIT_MAX_TARGETS = 1000;

type Encoded = null | string | boolean | number
  | ["number" | "bigint" | "date" | "bytes" | "reference", string]
  | ["timestamp" | "geopoint", number, number]
  | ["vector", Encoded[]]
  | ["array", Encoded[]]
  | ["object", [string, Encoded][]];

export function encodeAuditData(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(encode(value)), "utf8");
}

export function decodeAuditData(bytes: Buffer, db: Firestore): unknown {
  return decode(JSON.parse(bytes.toString("utf8")) as Encoded, db);
}

/** Leave room for the log's wrappers under Firestore's 20-level nesting limit. */
export function canInlineAuditData(value: unknown, depth = 0): boolean {
  if (depth > 16) return false;
  if (Array.isArray(value)) return value.every((v) => canInlineAuditData(v, depth + 1));
  if (isRecord(value)) return Object.values(value).every((v) => canInlineAuditData(v, depth + 1));
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object"
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function encode(value: unknown): Encoded {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    return Number.isFinite(value) && !Object.is(value, -0) ? value : ["number", Object.is(value, -0) ? "-0" : String(value)];
  }
  if (typeof value === "bigint") return ["bigint", String(value)];
  if (value instanceof Timestamp) return ["timestamp", value.seconds, value.nanoseconds];
  if (value instanceof Date) return ["date", value.toISOString()];
  if (value instanceof Uint8Array) return ["bytes", Buffer.from(value).toString("base64")];
  // Snapshot references belong to the database that owns the log. Decode
  // them against that same Firestore instance, as the SDK does for snapshots.
  if (value instanceof DocumentReference) return ["reference", value.path];
  if (value instanceof GeoPoint) return ["geopoint", value.latitude, value.longitude];
  // VectorValue isn't re-exported by firebase-admin, but toArray() is its
  // public API. Stored maps cannot have a function-valued toArray field.
  if (value && typeof value === "object" && "toArray" in value && typeof value.toArray === "function") {
    return ["vector", (value.toArray() as number[]).map(encode)];
  }
  if (Array.isArray(value)) return ["array", value.map(encode)];
  if (isRecord(value)) return ["object", Object.entries(value).map(([key, v]) => [key, encode(v)])];
  throw new Error("Unsupported value in audit payload");
}

function decode(value: Encoded, db: Firestore): unknown {
  if (!Array.isArray(value)) return value;
  switch (value[0]) {
    case "number": return Number(value[1]);
    case "bigint": return BigInt(value[1]);
    case "date": return new Date(value[1]);
    case "bytes": return Buffer.from(value[1], "base64");
    case "reference": return db.doc(value[1]);
    case "timestamp": return new Timestamp(value[1], value[2]);
    case "geopoint": return new GeoPoint(value[1], value[2]);
    case "vector": return FieldValue.vector(value[1].map((v) => decode(v, db) as number));
    case "array": return value[1].map((v) => decode(v, db));
    case "object": return Object.fromEntries(value[1].map(([key, v]) => [key, decode(v, db)]));
    default: throw new Error("Invalid audit payload encoding");
  }
}
