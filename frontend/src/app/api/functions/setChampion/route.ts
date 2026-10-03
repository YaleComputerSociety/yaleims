import { adminDb } from "../../../../../lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { isValidCollegeAbbrev } from "@src/utils/helpers";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token");
    if (!token?.value) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return new Response(JSON.stringify({ error: "server misconfigured" }), {
        status: 500,
      });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token.value, secret);
    } catch {
      return new Response(JSON.stringify({ error: "invalid token" }), {
        status: 401,
      });
    }

    const mRoles: string[] = Array.isArray(decoded?.mRoles) ? decoded.mRoles : [];
    if (!mRoles.includes("admin")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 403,
      });
    }

    const body = await req.json();
    const rawId = body.winningCollegeId;
    const winningCollegeId: string | null =
      typeof rawId === "string" && rawId.length > 0 ? rawId : null;
    const celebrationActive: boolean = !!body.celebrationActive;

    if (winningCollegeId && !isValidCollegeAbbrev(winningCollegeId)) {
      return new Response(
        JSON.stringify({ error: "invalid winningCollegeId" }),
        { status: 400 }
      );
    }

    if (celebrationActive && !winningCollegeId) {
      return new Response(
        JSON.stringify({ error: "pick a winning college before activating" }),
        { status: 400 }
      );
    }

    await adminDb.collection("seasons").doc("current").set(
      {
        winningCollegeId,
        celebrationActive,
        championshipUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
