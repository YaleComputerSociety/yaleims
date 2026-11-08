import { toJson } from "@/lib/api/core";
import { toPublicEntry, type Roster } from "@/lib/api/roster";
import { seesParticipants, shownEntries } from "@/lib/participants";
import { can, requireViewer } from "@/server/auth";
import { getMatch } from "@/server/data/matches";
import { getPlayer } from "@/server/data/players";
import { listRoster } from "@/server/data/roster";
import { getUsers, identityOf } from "@/server/data/users";
import { ok, route } from "@/server/http";

type Params = { seasonId: string; matchId: string };

/**
 * The game's participants for those who may see them (lib/participants.ts):
 * names and NetIDs (emails for admins), without ids; and the caller's own
 * entry (a removed one too, so the page can say why they can't sign up).
 * Signed in; an unknown game has none.
 */
export const GET = route<Params>(async (req, { params }) => {
  const { seasonId, matchId } = await params;
  const viewer = await requireViewer();
  const [match, roster, player, staff, withEmail] = await Promise.all([
    getMatch(seasonId, matchId),
    listRoster(seasonId, matchId),
    getPlayer(seasonId, viewer.userId),
    can.takeAttendance(viewer),
    can.seeEmails(viewer),
  ]);
  const mine = roster.find((e) => e.playerId === viewer.userId);
  const started = !!match && match.startsAt.toMillis() <= Date.now();
  const visible = !!match && seesParticipants({ staff, collegeId: player?.collegeId ?? null, onGame: !!mine && mine.captainStatus !== "removed" }, match);
  const shown = visible ? shownEntries(roster, started) : [];
  const users = await getUsers(shown.map((e) => e.playerId));
  const items = shown.map((e) => ({ ...toPublicEntry(e), ...identityOf(users.get(e.playerId), e.name, withEmail) }));
  return ok({ visible, started, items, total: items.length, mine: mine ? toJson(mine) : null } satisfies Roster);
});
