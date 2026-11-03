import { NextResponse } from "next/server";
import type { SessionState } from "@/lib/api/auth";
import { getViewer } from "@/server/auth";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { ok, route } from "@/server/http";
import { joinSeason } from "@/server/services/accounts";
import { clearSessionCookie, getSessionToken } from "@/server/session";

/**
 * Who is signed in, with their roles, college and captaincies this season
 * (read from Firestore, not the cookie). A returning student joins the
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
  const [user, player, captainOf] = await Promise.all([viewer.user(), viewer.player(), viewer.captainOf()]);
  return ok({
    signedIn: true,
    viewer: {
      email: viewer.email,
      name: viewer.name,
      username: user?.username ?? "Anonymous",
      collegeId: player?.collegeId ?? null,
      roles: [...(user?.roles ?? []), ...(player?.roles ?? [])],
      captainOf,
    },
  } satisfies SessionState);
});
