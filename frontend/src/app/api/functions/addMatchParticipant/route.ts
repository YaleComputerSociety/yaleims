import { getSession, getSessionToken } from "@/server/session";
import { isRosterSide, signUp, type SignUpResult } from "@/server/services/signups";

function refusal(result: Exclude<SignUpResult, "ok">, email: string): Response {
  switch (result) {
    case "no-match":
      return Response.json({ error: "Match not found" }, { status: 404 });
    case "no-rosters":
      return Response.json(
        { error: "Invalid match data, missing participant fields" },
        { status: 400 }
      );
    case "already-signed-up":
      return Response.json({ error: `${email} is already a participant` }, { status: 400 });
  }
}

/** Signs the signed-in user up for a game, on the side `participantType` names. */
export async function POST(req: Request) {
  try {
    const { matchId, seasonId, participantType, matchTimestamp } = await req.json();
    if (!(await getSessionToken())) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    }
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }
    if (!matchId || !participantType || !matchTimestamp || !seasonId) {
      return Response.json({ error: "Missing required parameters" }, { status: 400 });
    }
    // The side is written as a field name on the match, so only the two roster
    // fields are accepted (D21).
    if (!isRosterSide(participantType)) {
      return Response.json({ error: "Invalid participantType" }, { status: 400 });
    }

    const result = await signUp({
      email: session.email,
      name: session.name,
      seasonId: String(seasonId),
      matchId,
      side: participantType,
      matchTimestamp,
    });
    if (result !== "ok") {
      return refusal(result, session.email);
    }
    return Response.json({
      message: "Successfully signed up and updated your matches!",
    });
  } catch (err) {
    console.error("Error signing up for a match:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
