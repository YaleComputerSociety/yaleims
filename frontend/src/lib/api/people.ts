// The People API (admins; account plan, step 9): find anyone the site
// knows by exact NetID, or list the people without a college this season or
// who haven't signed in yet (/api/people); one person's identity, season and
// attendance (/api/people/{userId}); and the corrections: name and email
// (PATCH there), their college (…/college), one game's attendance
// (…/attendance/{matchId}). Every edit sends the revision it was made on (a
// stale one gets 409) and, except a confirmation, a reason for the audit log.
import { z } from "zod";
import type { CollegeAssignment, GlobalRole, NameSource, SeasonRole } from "@/types/firestore";
import { collegeIdSchema } from "./colleges";
import { NETID_PATTERN } from "../netid";
import { request, url, type Json } from "./core";
import type { OwnReview } from "./reviews";

const netid = z.string().trim().toLowerCase().regex(NETID_PATTERN, "That doesn't look like a NetID.");
const reason = z.string().trim().min(1, "Say why (it goes in the audit log).").max(300);
/** The doc's revision the edit was made on (null: the doc doesn't exist yet). */
const revision = z.string().min(1).nullable();

/** GET /api/people?netid=… (exact) or ?list=unassigned|unclaimed (this season; the first 200). */
export const peopleQuerySchema = z.union([
  z.strictObject({ netid }),
  z.strictObject({ list: z.enum(["unassigned", "unclaimed"]) }),
]);
export type PeopleQuery = z.infer<typeof peopleQuerySchema>;

export interface PersonSummary {
  userId: string;
  netid: string | null;
  name: string;
  /** Signed in at least once (an account made by a captain or supervisor isn't, until then). */
  claimed: boolean;
  /** This season's college; null: unassigned, or not a player this season (`inSeason`). */
  collegeId: string | null;
  inSeason: boolean;
}

export interface PeopleList {
  items: PersonSummary[];
  total: number;
}

/** One game of the person's season, as recorded on its roster (whether or not the game still exists). */
export interface PersonGame {
  matchId: string;
  startsAt: string;
  sportId: string;
  /** null: the game is gone (its entry remains). */
  homeCollegeId: string | null;
  awayCollegeId: string | null;
  /** The side they're on. */
  collegeId: string;
  addedBy: string;
  captainStatus: string | null;
  present: boolean | null;
  /** By lib/attendance.ts; false once an admin confirmed it. */
  underReview: boolean;
  confirmedByAdmin: boolean;
  revision: string;
}

/** GET /api/people/{userId}?seasonId: everything an admin needs about a person in a season. */
export interface Person extends PersonSummary {
  email: string | null;
  nameSource: NameSource;
  createdBy: string | null;
  roles: GlobalRole[];
  revision: string;
  seasonId: string;
  season: {
    collegeHistory: Json<CollegeAssignment>[];
    roles: SeasonRole[];
    captainOf: { collegeId: string; sportId: string }[];
    revision: string;
  } | null;
  games: PersonGame[];
  requests: (OwnReview & { revision: string })[];
}

export const personQuerySchema = z.strictObject({ seasonId: z.string().min(1) });

/** PATCH /api/people/{userId}: an admin's name (locked against the directory after) and/or Yale email. */
export const profileFixSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(60).regex(/^[^\p{C}<>]+$/u, "A name can't contain < > or control characters.").optional(),
    email: z.string().trim().toLowerCase().regex(/^[^\s@]+@([a-z0-9-]+\.)*yale\.edu$/, "A Yale email address.").nullable().optional(),
    /** Gives an admin-set name back to the person to change (D-N4). */
    unlockName: z.literal(true).optional(),
    reason,
    revision: z.string().min(1),
  })
  .refine((f) => f.name !== undefined || f.email !== undefined || f.unlockName, "Send a name, an email or unlockName.")
  .refine((f) => !(f.name !== undefined && f.unlockName), "Set a name or unlock it, not both.");
export type ProfileFix = z.infer<typeof profileFixSchema>;

/** PUT /api/people/{userId}/college: their college in a season (null: unassigned, kept so until an admin changes it). */
export const collegeFixSchema = z.strictObject({ seasonId: z.string().min(1), collegeId: collegeIdSchema.nullable(), reason, revision });
export type CollegeFix = z.infer<typeof collegeFixSchema>;

/** PATCH /api/people/{userId}/attendance/{matchId}: confirm (or take back) disputed attendance, remove the entry, or move it to the right person. */
export const attendanceFixSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("confirm"), confirmed: z.boolean(), seasonId: z.string().min(1), revision: z.string().min(1) }),
  z.strictObject({ action: z.literal("remove"), seasonId: z.string().min(1), reason, revision: z.string().min(1) }),
  z.strictObject({ action: z.literal("reassign"), netid, seasonId: z.string().min(1), reason, revision: z.string().min(1) }),
]);
export type AttendanceFix = z.infer<typeof attendanceFixSchema>;

export const findPeople = (query: PeopleQuery) => request<PeopleList>("GET", "/api/people", { query });
export const fetchPerson = (userId: string, seasonId: string) => request<Person>("GET", url`/api/people/${userId}`, { query: { seasonId } });
export const fixProfile = (userId: string, fix: ProfileFix) => request<void>("PATCH", url`/api/people/${userId}`, { body: fix });
export const fixCollege = (userId: string, fix: CollegeFix) => request<void>("PUT", url`/api/people/${userId}/college`, { body: fix });
export const fixAttendance = (userId: string, matchId: string, fix: AttendanceFix) =>
  request<void>("PATCH", url`/api/people/${userId}/attendance/${matchId}`, { body: fix });
