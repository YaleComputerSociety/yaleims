import { toJson } from "@/lib/api/core";
import { toPublicEntry, type Roster } from "@/lib/api/roster";
import { requireViewer } from "@/server/auth";
import { listRoster } from "@/server/data/roster";
import { ok, route } from "@/server/http";

type Params = { seasonId: string; matchId: string };

/** The game's players, without emails, and the caller's own entry (signed in; an unknown game has none). */
export const GET = route<Params>(async (req, { params }) => {
  const { seasonId, matchId } = await params;
  const viewer = await requireViewer();
  const roster = await listRoster(seasonId, matchId);
  const playing = roster.filter((e) => e.captainStatus !== "removed");
  const mine = roster.find((e) => e.playerId === viewer.email);
  return ok({
    items: playing.map(toPublicEntry),
    total: playing.length,
    mine: mine ? toJson(mine) : null,
  } satisfies Roster);
});
