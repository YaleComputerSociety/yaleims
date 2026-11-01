import { NextResponse } from "next/server";
import type { VerifyResponse } from "@/types/api";
import {
  Session,
  clearSessionCookie,
  getSession,
  getSessionToken,
  setSessionCookie,
} from "@/server/session";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { getUser } from "@/server/data/users";
import { accountFields, joinSeason, type AccountFields } from "@/server/services/accounts";

const sameRoles = (a: string[] = [], b: string[] = []): boolean =>
  a.length === b.length && a.every((role) => b.includes(role));

// Roles, username and college always come from Firestore, never from the
// request: this route used to re-sign the session with roles passed in the
// query string, which let any logged-in user make themselves admin. A session
// older than the season (or than the v3 cutover) joins the season here, as a
// login would (D30). Without a user doc only the roles drop; null when there
// is no current season.
async function freshUserFields(session: Session): Promise<Partial<AccountFields> | null> {
  const seasonId = await getCurrentSeasonId();
  if (!seasonId) return null;
  const user = await getUser(session.email);
  if (!user) return { role: "user", mRoles: ["user"] };
  const player = await joinSeason(seasonId, session.email, session.name, session.college);
  return accountFields(seasonId, session.email, user, player);
}

export async function GET(): Promise<NextResponse> {
  if (!(await getSessionToken())) {
    return NextResponse.json({ isLoggedIn: false } satisfies VerifyResponse);
  }

  let session: Session | null;
  try {
    session = await getSession();
  } catch (error) {
    console.error("verify: cannot check the session:", error);
    return NextResponse.json({ isLoggedIn: false } satisfies VerifyResponse, { status: 500 });
  }
  if (!session) {
    const response = NextResponse.json({ isLoggedIn: false } satisfies VerifyResponse, {
      status: 401,
    });
    clearSessionCookie(response);
    return response;
  }

  let fresh: Partial<AccountFields> | null = null;
  try {
    fresh = await freshUserFields(session);
  } catch (err) {
    // Firestore unavailable: keep the session as signed rather than log out.
    console.error("verify: could not read user doc:", err);
  }

  const mergedUser: Session = {
    ...session,
    role: fresh?.role ?? session.role,
    mRoles: fresh?.mRoles ?? session.mRoles,
    username: fresh?.username ?? session.username,
    college: fresh?.college ?? session.college,
  };

  const changed =
    mergedUser.role !== session.role ||
    !sameRoles(mergedUser.mRoles, session.mRoles) ||
    mergedUser.username !== session.username ||
    mergedUser.college !== session.college;

  const res = NextResponse.json(
    { isLoggedIn: true, user: mergedUser } satisfies VerifyResponse,
    { status: 200 }
  );
  if (changed) {
    setSessionCookie(res, mergedUser);
  }
  return res;
}
