// The brackets API: a season's playoffs and tournaments
// (/api/seasons/{seasonId}/brackets) and one bracket with its games. Their
// games are ordinary matches; a bye is a slot with a college and no game.
import { z } from "zod";
import type { SlotInput } from "@/types/api";
import type { BracketDoc, WithId } from "@/types/firestore";
import { collegeIdSchema } from "./colleges";
import { request, url, type Json } from "./core";
import type { Match } from "./matches";

export type Bracket = Json<WithId<BracketDoc>>;

/** GET /api/seasons/{s}/brackets?kind (public): newest first. */
export interface BracketList {
  items: Bracket[];
  total: number;
}

/** GET /api/seasons/{s}/brackets/{bracketId} (public): the bracket and its games, in slot order. */
export interface BracketDetail extends Bracket {
  matches: Match[];
}

export const bracketsQuerySchema = z.strictObject({ kind: z.enum(["playoffs", "tournament"]).optional() });
export type BracketsQuery = z.input<typeof bracketsQuerySchema>;

const seed = z.number().int().min(0).nullable();
const text = z.string().trim().max(200).nullable();

/**
 * One slot as an admin uploads it. A bye slot (1 and 7) names its college as
 * home; empty sides (null) wait for a winner ("TBD"). Without a start the
 * game starts at the upload's time.
 */
export const bracketSlotSchema = z.strictObject({
  slot: z.number().int().min(1).max(16),
  homeCollegeId: collegeIdSchema.nullable(),
  awayCollegeId: collegeIdSchema.nullable(),
  homeSeed: seed,
  awaySeed: seed,
  /** Playoffs only; a slot without one takes its feeders' shared division. */
  division: z.enum(["blue", "green", "final"]).nullable(),
  startsAt: z.iso.datetime({ offset: true }).nullable(),
  venue: text,
  venueDetail: text,
});
export type BracketSlotInput = z.infer<typeof bracketSlotSchema>;

/**
 * The bracket and tournament forms' rows (and their CSVs) as v3 slots: "" and
 * "TBD" are empty sides, a seed of -1 is none, divisions are lowercased
 * ("none" is none). Unknown colleges pass through; the server refuses them.
 */
export function slotsFromForm(rows: SlotInput[]): BracketSlotInput[] {
  const college = (value: unknown) => (typeof value === "string" && value !== "" && value !== "TBD" ? value : null);
  const division = (value: unknown) => {
    const v = typeof value === "string" ? value.toLowerCase() : "";
    return v === "blue" || v === "green" || v === "final" ? v : null;
  };
  const seed = (value: number | undefined) => (typeof value === "number" && value >= 0 ? value : null);
  return rows.map((s) => ({
    slot: s.match_slot,
    homeCollegeId: college(s.home_college),
    awayCollegeId: college(s.away_college),
    homeSeed: seed(s.home_seed),
    awaySeed: seed(s.away_seed),
    division: division(s.division),
    startsAt: s.timestamp || null,
    venue: s.location || null,
    venueDetail: s.location_extra || null,
  }));
}

const placementPoint = z.number().min(0);

/** A tournament's placement bonus points when the upload names none. */
export const DEFAULT_PLACEMENT_POINTS = { first: 20, second: 15, third: 10 };

/**
 * POST /api/seasons/{s}/brackets (admins, current season): a sport's
 * playoffs (named "<sport> Playoffs") or a named tournament with placement
 * bonus points.
 */
export const newBracketSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("playoffs"),
    sportId: z.string().min(1),
    slots: z.array(bracketSlotSchema).max(15),
  }),
  z.strictObject({
    kind: z.literal("tournament"),
    name: z.string().trim().min(1).max(100),
    sportId: z.string().min(1),
    slots: z.array(bracketSlotSchema).max(16),
    placementPoints: z
      .strictObject({ first: placementPoint, second: placementPoint, third: placementPoint })
      .default(DEFAULT_PLACEMENT_POINTS),
  }),
]);
export type NewBracket = z.infer<typeof newBracketSchema>;

/** DELETE …/brackets/{b}?force=true: also when its games are scored (their points are taken back). */
export const deleteBracketQuerySchema = z.strictObject({ force: z.stringbool().default(false) });

export const fetchBrackets = (seasonId: string, query: BracketsQuery = {}) =>
  request<BracketList>("GET", url`/api/seasons/${seasonId}/brackets`, { query });

export const fetchBracket = (seasonId: string, bracketId: string) =>
  request<BracketDetail>("GET", url`/api/seasons/${seasonId}/brackets/${bracketId}`);

export const createBracket = (seasonId: string, bracket: NewBracket) =>
  request<{ id: string }>("POST", url`/api/seasons/${seasonId}/brackets`, { body: bracket });

/** Refused with 409 `conflict` and `details.scoredMatchIds` while games are scored, unless `force`. */
export const deleteBracket = (seasonId: string, bracketId: string, force = false) =>
  request<void>("DELETE", url`/api/seasons/${seasonId}/brackets/${bracketId}`, { query: { force } });
