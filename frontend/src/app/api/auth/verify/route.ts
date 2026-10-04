import { NextResponse } from "next/server";
import { adminDb } from "../../../../../lib/firebaseAdmin";
import {
  Session,
  clearSessionCookie,
  getSession,
  getSessionToken,
  setSessionCookie,
} from "@/server/session";

const sameRoles = (a: string[] = [], b: string[] = []): boolean =>
  a.length === b.length && a.every((role) => b.includes(role));

// Roles, username and college always come from the user's Firestore doc, never
// from the request: this route used to re-sign the session with roles passed
// in the query string, which let any logged-in user make themselves admin.
async function freshUserFields(email: string) {
  const snap = await adminDb.collection("users").doc(email).get();
  const data = snap.data() ?? {};
  return {
    role: typeof data.role === "string" ? data.role : "user",
    mRoles:
      Array.isArray(data.mRoles) && data.mRoles.length > 0
        ? (data.mRoles as string[])
        : ["user"],
    username: typeof data.username === "string" ? data.username : undefined,
    college: typeof data.college === "string" ? data.college : undefined,
  };
}

export async function GET(): Promise<NextResponse> {
  if (!(await getSessionToken())) {
    return NextResponse.json({ isLoggedIn: false }, { status: 200 });
  }

  let session: Session | null;
  try {
    session = await getSession();
  } catch (error) {
    console.error("verify: cannot check the session:", error);
    return NextResponse.json({ isLoggedIn: false }, { status: 500 });
  }
  if (!session) {
    const response = NextResponse.json({ isLoggedIn: false }, { status: 401 });
    clearSessionCookie(response);
    return response;
  }

  let fresh: Awaited<ReturnType<typeof freshUserFields>> | null = null;
  try {
    fresh = await freshUserFields(session.email);
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

  const res = NextResponse.json({ isLoggedIn: true, user: mergedUser }, { status: 200 });
  if (changed) {
    setSessionCookie(res, mergedUser);
  }
  return res;
}
