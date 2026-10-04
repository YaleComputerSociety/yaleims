import { adminDb } from "../../../../../lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { getSession, hasAnyRole } from "@/server/session";
import { isValidCollegeAbbrev } from "@src/utils/helpers";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
      });
    }
    if (!hasAnyRole(session, ["admin"])) {
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
