import { ApiError, toJson } from "@/lib/api/core";
import { championChangeSchema, type SeasonDetail } from "@/lib/api/seasons";
import { easternDate, mondayOf, seasonStart } from "@/lib/dates";
import { sortSports } from "@/lib/sports";
import { authorize, can, requireCurrentSeason } from "@/server/auth";
import { firstMatchStart } from "@/server/data/matches";
import { getSeason, setChampionship } from "@/server/data/seasons";
import { listSports } from "@/server/data/sports";
import { noContent, ok, readBody, route } from "@/server/http";

type Params = { seasonId: string };

/** The season, its sports and MVP week 1 (public). */
export const GET = route<Params>(async (req, { params }) => {
  const { seasonId } = await params;
  const season = await getSeason(seasonId);
  if (!season) throw new ApiError("not-found", "No such season.");
  const [sports, firstGame] = await Promise.all([
    listSports(seasonId),
    // Within the season, so a stray early date can't stretch the MVP weeks.
    firstMatchStart(seasonId, seasonStart(season.startYear)),
  ]);
  return ok({
    ...toJson(season),
    sports: toJson(sortSports(sports)),
    mvpWeekOne: firstGame && mondayOf(easternDate(firstGame)),
  } satisfies SeasonDetail);
});

/** Sets the champion banner (admin, current season; audit-logged). */
export const PATCH = route<Params>(async (req, { params }) => {
  const { seasonId } = await params;
  const viewer = await authorize(can.setChampion);
  await requireCurrentSeason(seasonId);
  const change = await readBody(req, championChangeSchema);
  if (!(await setChampionship(seasonId, change, await viewer.actor()))) {
    throw new ApiError("not-found", "No such season.");
  }
  return noContent();
});
