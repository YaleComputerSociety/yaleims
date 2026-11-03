// The directory API: who a NetID is (/api/directory/{netid}), before a
// captain or supervisor adds them to a game. From the Yale directory
// (Yalies), or the account that has the NetID when Yalies doesn't answer.
import { z } from "zod";
import { NETID_PATTERN } from "../netid";
import { request, url } from "./core";

export const directoryNetidSchema = z.strictObject({
  netid: z.string().trim().toLowerCase().regex(NETID_PATTERN, "That doesn't look like a NetID."),
});

/** GET /api/directory/{netid}: found (name; their college when the directory gives one), or why not. */
export type DirectoryEntry =
  | { status: "found"; netid: string; name: string; collegeId: string | null }
  | { status: "not-found" | "unavailable"; netid: string };

export const lookUpNetid = (netid: string) => request<DirectoryEntry>("GET", url`/api/directory/${netid}`);
