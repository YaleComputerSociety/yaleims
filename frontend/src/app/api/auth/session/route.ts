import { NextResponse } from "next/server";
import type { SessionState } from "@/lib/api/auth";
import { can, getViewer } from "@/server/auth";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { ok, route } from "@/server/http";
import { placeholderId } from "@/lib/netid";
import { getPlayer } from "@/server/data/players";
import { claimPlaceholders, joinSeason, recordNetid } from "@/server/services/accounts";
import { clearSessionCookie, getSessionToken } from "@/server/session";

/**
 * Who is signed in, with their roles, college, captaincies and what they may
 * do this season (read from Firestore, not the cookie). Records a user's
 * NetID when it isn't stored yet, and claims what was added under it. A returning student joins the
 * current season here, as at login (D30), with the college of their login:
 * a GET that may create their player doc, on purpose. An invalid session
 * cookie is cleared.
 */
export const GET = route(async () => {
  const viewer = await getViewer();
  if (!viewer) {
    const res = NextResponse.json({ signedIn: false } satisfies SessionState);
    if (await getSessionToken()) clearSessionCookie(res);
    return res;
  }
  const seasonId = await getCurrentSeasonId();
  if (seasonId) await joinSeason(seasonId, viewer.email, viewer.name, viewer.college);
  const [user, player, captainOf, editSchedule, score, takeAttendance, setChampion, manageRoles] = await Promise.all([
    viewer.user(),
    viewer.player(),
    viewer.captainOf(),
    can.editSchedule(viewer),
    can.score(viewer),
    can.takeAttendance(viewer),
    can.setChampion(viewer),
    can.manageRoles(viewer),
  ]);
  // Users from before NetIDs were kept get theirs on their next visit (the cookie carries it),
  // and a NetID someone added for them unverified becomes theirs (one read when there is none).
  if (user && !user.netid && viewer.netid) await recordNetid(viewer.email, viewer.netid);
  if (seasonId && viewer.netid && (await getPlayer(seasonId, placeholderId(viewer.netid)))) {
    await claimPlaceholders(viewer.netid, viewer.email, viewer.name);
  }
  return ok({
    signedIn: true,
    viewer: {
      email: viewer.email,
      name: viewer.name,
      username: user?.username ?? "Anonymous",
      collegeId: player?.collegeId ?? null,
      roles: [...(user?.roles ?? []), ...(player?.roles ?? [])],
      captainOf,
      can: { editSchedule, score, takeAttendance, setChampion, manageRoles },
    },
  } satisfies SessionState);
});
