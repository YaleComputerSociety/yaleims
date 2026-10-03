import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { adminDb } from "../../../../../lib/firebaseAdmin";

interface DecodedToken {
  name: string;
  netid: string;
  email: string;
  role: string;
  mRoles: string[];
  username: string;
  college: string;
  matches_played: number;
}

function isValidDecodedToken(decoded: any): decoded is DecodedToken {
  return (
    typeof decoded === "object" &&
    typeof decoded.netid === "string" &&
    typeof decoded.email === "string"
  );
}

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
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token");

    if (!token?.value) {
      return NextResponse.json({ isLoggedIn: false }, { status: 200 });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error("JWT_SECRET is not defined");
      return NextResponse.json({ isLoggedIn: false }, { status: 500 });
    }

    const decoded = jwt.verify(token.value, JWT_SECRET);

    if (!isValidDecodedToken(decoded)) {
      console.error("Invalid token structure");
      return NextResponse.json({ isLoggedIn: false }, { status: 401 });
    }

    let fresh: Awaited<ReturnType<typeof freshUserFields>> | null = null;
    try {
      fresh = await freshUserFields(decoded.email);
    } catch (err) {
      // Firestore unavailable: keep the session as signed rather than log out.
      console.error("verify: could not read user doc:", err);
    }

    const mergedUser: DecodedToken = {
      name: decoded.name,
      netid: decoded.netid,
      email: decoded.email,
      role: fresh?.role ?? decoded.role,
      mRoles: fresh?.mRoles ?? decoded.mRoles,
      username: fresh?.username ?? decoded.username,
      college: fresh?.college ?? decoded.college,
      matches_played: decoded.matches_played,
    };

    const changed =
      mergedUser.role !== decoded.role ||
      !sameRoles(mergedUser.mRoles, decoded.mRoles) ||
      mergedUser.username !== decoded.username ||
      mergedUser.college !== decoded.college;

    const res = NextResponse.json({ isLoggedIn: true, user: mergedUser }, { status: 200 });

    if (changed) {
      const newToken = jwt.sign(mergedUser, JWT_SECRET, { expiresIn: "7d" });
      res.cookies.set("token", newToken, {
        secure: true, 
        httpOnly: true,
        sameSite: "none",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }
    return res
  } catch (error) {
    console.error("Authentication error:", error);
    const response = NextResponse.json({ isLoggedIn: false }, { status: 401 });
    response.cookies.delete("token");
    return response;
  }
}