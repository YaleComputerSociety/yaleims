import { ApiError } from "@/lib/api/core";
import { rosterAddSchema, rosterChangeSchema } from "@/lib/api/roster";
import { authorize, can, requireViewer, type Viewer } from "@/server/auth";
import { getMatch } from "@/server/data/matches";
import { getPlayer } from "@/server/data/players";
import { getRosterEntry } from "@/server/data/roster";
import { noContent, readBody, route } from "@/server/http";
import { addToGame, changeEntry, throwIfRefused, type SheetEditor } from "@/server/services/roster";

type Params = { seasonId: string; matchId: string; playerId: string };

const NO_MATCH = new ApiError("not-found", "No such game this season.");
const STARTED = new ApiError("conflict", "The game has started: only a supervisor can change its roster now.");

/** The caller as an editor of `collegeId`'s side of `sportId`'s game: a supervisor and/or that team's captain (403 otherwise). */
async function editorOf(viewer: Viewer, collegeId: string, sportId: string): Promise<SheetEditor> {
  await authorize(can.manageRoster, collegeId, sportId);
  const [supervisor, captain, actor] = await Promise.all([
    can.takeAttendance(viewer),
    can.prepareRoster(viewer, collegeId, sportId),
    viewer.actor(),
  ]);
  return { supervisor, captain, actor };
}

/**
 * Changes one player's entry: the captain's call (confirmed = pre-confirmed,
 * removed, or null to take it back) until the start; attendance (supervisors,
 * any time, before the start too). Supervisors may take a player off or put
 * them back, not pre-confirm or take back a captain's pre-confirmation.
 * Putting a player back restores what taking them off replaced (C12).
 */
export const PATCH = route<Params>(async (req, { params }) => {
  const { seasonId, matchId, playerId } = await params;
  const viewer = await requireViewer();
  const change = await readBody(req, rosterChangeSchema);
  const [match, entry] = await Promise.all([getMatch(seasonId, matchId), getRosterEntry(seasonId, matchId, playerId)]);
  if (!match) throw NO_MATCH;
  if (!entry) throw new ApiError("not-found", "They aren't on this game.");
  const editor = await editorOf(viewer, entry.collegeId, match.sportId);
  if (change.present !== undefined && !editor.supervisor) {
    throw new ApiError("forbidden", "Only a supervisor confirms who came.");
  }
  const result = await changeEntry(seasonId, matchId, playerId, change, editor);
  if (result === "no-match") throw NO_MATCH;
  if (result === "no-entry") throw new ApiError("not-found", "They aren't on this game.");
  if (result === "cancelled") throw new ApiError("conflict", "This game is cancelled.");
  if (result === "started") throw STARTED;
  if (result === "taken-off") throw new ApiError("conflict", "They're taken off this game: put them back first.");
  if (result === "captains-only") throw new ApiError("forbidden", "Only the team's captains pre-confirm players; supervisors confirm who came.");
  return noContent();
});

/**
 * Puts a season player on a side of the game (body { collegeId }; without
 * one, their college's): a captain's addition is confirmed (until the
 * start), a supervisor's present. Someone unassigned this season goes on
 * any side the caller manages, for this game only (account plan, 4a).
 */
export const PUT = route<Params>(async (req, { params }) => {
  const { seasonId, matchId, playerId } = await params;
  await requireViewer();
  // The body is optional (older pages send none).
  const { collegeId } = (await req.clone().text()) ? await readBody(req, rosterAddSchema) : { collegeId: undefined };
  const [match, player] = await Promise.all([getMatch(seasonId, matchId), getPlayer(seasonId, playerId)]);
  if (!match) throw NO_MATCH;
  if (!player) throw new ApiError("not-found", "They aren't a player this season.");
  const side = collegeId ?? player.collegeId;
  if (!side) throw new ApiError("bad-request", "Their college is unassigned this season: choose a side.");
  const viewer = await authorize(can.manageRoster, side, match.sportId);
  throwIfRefused(await addToGame(seasonId, matchId, side, { playerId }, await viewer.actor()));
  return noContent();
});
