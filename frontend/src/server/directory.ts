// The Yale directory (Yalies): the name, email and college of a NetID. One
// lookup, lookUpNetid, serves sign-in, the Profile's "Check Yalies again"
// and staff adds. It trusts a record only for the exact NetID asked, and
// checks each field on its own, so a record without an email still gives
// its name and college. Page reads never call it: what a lookup found is
// stored on the user (services/accounts.ts). YALIES_API_URL points it
// elsewhere (the integration tests' fake directory).
import "server-only";
import type { DirectoryOutcome } from "@/types/firestore";

/** What the directory says about one NetID; a field it lacks (or gives unusably) is null. */
export interface DirectoryPerson {
  netid: string;
  name: string | null;
  /** A Yale address. */
  email: string | null;
  /** The college as Yalies names it ("Morse College"); services map it to the season's colleges. */
  college: string | null;
}

/** found: name, email and college; partial: the NetID's record lacks some; not-found: no record (or two). */
export type DirectoryResult =
  | { outcome: Extract<DirectoryOutcome, "found" | "partial">; person: DirectoryPerson }
  | { outcome: Extract<DirectoryOutcome, "not-found" | "unavailable">; person: null };

/** The directory's record of `netid` (lowercase); "unavailable" when Yalies can't be reached or answers nonsense. */
export async function lookUpNetid(netid: string): Promise<DirectoryResult> {
  let people: unknown[];
  try {
    people = await yaliesPeople({ netid });
  } catch (error) {
    console.error(`Yalies lookup failed: ${(error as Error).message}`);
    return { outcome: "unavailable", person: null };
  }
  const records = people.filter(
    (p): p is Record<string, unknown> => isRecord(p) && typeof p.netid === "string" && p.netid.toLowerCase() === netid
  );
  // None, or two people claiming one NetID: nothing to trust.
  if (records.length !== 1) return { outcome: "not-found", person: null };
  const [record] = records;
  const name = [text(record.first_name), text(record.last_name)].filter(Boolean).join(" ") || null;
  const email = text(record.email);
  const person = {
    netid,
    name,
    email: email && YALE_EMAIL.test(email) ? email : null,
    college: text(record.college),
  };
  return { outcome: person.name && person.email && person.college ? "found" : "partial", person };
}

const YALE_EMAIL = /^[^\s@]+@([a-z0-9-]+\.)*yale\.edu$/i;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/** A non-empty trimmed string, else null. */
function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** People from Yalies' directory: `filters` match exactly (case-sensitive). Throws when it can't be reached. */
async function yaliesPeople(filters: Record<string, string>): Promise<unknown[]> {
  const key = process.env.YALIES_API_KEY;
  if (!key) throw new Error("YALIES_API_KEY is not set");
  const base = process.env.YALIES_API_URL ?? "https://api.yalies.io/v2";
  const res = await fetch(`${base}/people`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ filters, page_size: 10 }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Yalies answered ${res.status}`);
  const people: unknown = await res.json();
  if (!Array.isArray(people)) throw new Error("Yalies answered something other than a list");
  return people;
}
