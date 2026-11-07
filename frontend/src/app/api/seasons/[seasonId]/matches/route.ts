import { ApiError } from "@/lib/api/core";
import {
  scheduleUploadSchema,
  seasonMatchesQuerySchema,
  toMatch,
  type MatchList,
  type ScheduleUploadResult,
} from "@/lib/api/matches";
import { authorize, can } from "@/server/auth";
import { listSeasonMatches, listSeasonMatchPage } from "@/server/data/matches";
import { created, ok, readBody, readQuery, route } from "@/server/http";
import { addSchedule } from "@/server/services/schedule";

type Params = { seasonId: string };

const date = (iso: string | undefined) => (iso ? new Date(iso) : undefined);

/** A season's games by start (public): one page with `page`, else every game that passes the filters. */
export const GET = route<Params>(async (req, { params }) => {
  const { seasonId } = await params;
  const query = readQuery(req, seasonMatchesQuerySchema);
  const filter = {
    collegeId: query.collegeId,
    sportId: query.sportId,
    status: query.status,
    from: date(query.from),
    to: date(query.to),
  };
  if (query.page === undefined) {
    const games = await listSeasonMatches(seasonId, filter, query.order);
    return ok({ items: games.map(toMatch), total: games.length } satisfies MatchList);
  }
  const { items, total } = await listSeasonMatchPage(seasonId, filter, query.order, {
    page: query.page, pageSize: query.pageSize,
  });
  return ok({ items: items.map(toMatch), total } satisfies MatchList);
});

/** Adds a sport's regular-season games, all or none (supervisors; audit-logged). */
export const POST = route<Params>(async (req, { params }) => {
  const { seasonId } = await params;
  const viewer = await authorize(can.editSchedule);
  const upload = await readBody(req, scheduleUploadSchema);
  const result = await addSchedule(seasonId, upload.sportId, upload.matches, await viewer.actor());
  if (result.status === "unknown-sport") {
    throw new ApiError("bad-request", "No such sport this season.");
  }
  if (result.status === "bad-rows") {
    throw new ApiError("bad-request", `Nothing was added. ${result.problems.join("; ")}`, {
      problems: result.problems,
    });
  }
  return created({ matchIds: result.matchIds } satisfies ScheduleUploadResult);
});
