import { bracketsQuerySchema, newBracketSchema, type BracketList } from "@/lib/api/brackets";
import { ApiError, toJson } from "@/lib/api/core";
import { authorize, can, requireCurrentSeason } from "@/server/auth";
import { listBrackets } from "@/server/data/brackets";
import { created, ok, readBody, readQuery, route } from "@/server/http";
import { createBracket } from "@/server/services/brackets";

type Params = { seasonId: string };

/** The season's playoffs and tournaments, newest first (public). */
export const GET = route<Params>(async (req, { params }) => {
  const { seasonId } = await params;
  const { kind } = readQuery(req, bracketsQuerySchema);
  const brackets = (await listBrackets(seasonId, kind)).sort(
    (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
  );
  return ok({ items: toJson(brackets), total: brackets.length } satisfies BracketList);
});

/** Creates a sport's playoffs or a tournament with its games (admin or dev, current season; audit-logged). */
export const POST = route<Params>(async (req, { params }) => {
  const { seasonId } = await params;
  const viewer = await authorize(can.editSchedule);
  await requireCurrentSeason(seasonId);
  const bracket = await readBody(req, newBracketSchema);
  const result = await createBracket(seasonId, bracket, await viewer.actor());
  switch (result.status) {
    case "created":
      return created({ id: result.id });
    case "exists":
      throw new ApiError("conflict", "A bracket with that name already exists this season.");
    case "unknown-sport":
      throw new ApiError("bad-request", "No such sport this season.");
    case "bad-input":
      throw new ApiError("bad-request", `${result.error}.`);
  }
});
