// The seasons API: GET /api/seasons, GET and PATCH /api/seasons/{seasonId}.
import { z } from "zod";
import type { SeasonDoc, SportDoc, WithId } from "@/types/firestore";
import { collegeIdSchema } from "./colleges";
import { request, url, type Json } from "./core";

export type Season = Json<WithId<SeasonDoc>>;
export type Sport = Json<WithId<SportDoc>>;

/** GET /api/seasons: every season, oldest first, and which one is current. */
export interface SeasonList {
  items: Season[];
  total: number;
  currentSeasonId: string | null;
}

/** GET /api/seasons/{seasonId}: the season, its sports in display order (lib/sports.ts) and MVP week 1. */
export interface SeasonDetail extends Season {
  sports: Sport[];
  /** The Monday (Eastern) of the week of the season's first game, "yyyy-mm-dd"; null: no games yet. */
  mvpWeekOne: string | null;
}

/** PATCH /api/seasons/{seasonId} (admin, current season): the champion banner. */
export const championChangeSchema = z
  .strictObject({
    championCollegeId: collegeIdSchema.nullable(),
    celebrationActive: z.boolean(),
  })
  .refine((change) => !change.celebrationActive || change.championCollegeId, {
    path: ["celebrationActive"],
    message: "Pick the champion before starting the celebration",
  });
export type ChampionChange = z.infer<typeof championChangeSchema>;

export const fetchSeasons = () => request<SeasonList>("GET", "/api/seasons");

export const fetchSeason = (seasonId: string) => request<SeasonDetail>("GET", url`/api/seasons/${seasonId}`);

export const setChampion = (seasonId: string, change: ChampionChange) =>
  request<void>("PATCH", url`/api/seasons/${seasonId}`, { body: change });
