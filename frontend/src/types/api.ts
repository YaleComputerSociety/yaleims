// What's left of the pre-v3 API types until Phase 2D step 6 is done: the
// bracket forms' rows and the match shape of the old helpers.
import type { MatchDoc } from "./legacy";

/**
 * A match in getMatches / getMatchesv2: the doc plus the season it was read
 * from. `id` is the stored numeric id (the doc id for a doc without one).
 */
export type MatchJson = Omit<MatchDoc, "id" | "timestamp"> & {
  id: number | string;
  seasonId: string;
  timestamp: string | null;
};

/** One bracket or tournament slot as the admin pages upload it. */
export interface SlotInput {
  match_slot: number;
  home_college: string;
  home_seed: number;
  away_college: string;
  away_seed: number;
  location: string;
  location_extra?: string;
  timestamp: string;
  /** Brackets only: "green" | "blue" | "final" | "none". */
  division?: string;
}

/** A playoff bracket upload. */
export interface BracketUpload {
  sport: string;
  matches: SlotInput[];
}
