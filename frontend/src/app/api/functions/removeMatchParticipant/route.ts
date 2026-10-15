import { getSession, getSessionToken } from "@/server/session";
import { isRosterSide, withdraw, type WithdrawResult } from "@/server/services/signups";

function refusal(result: Exclude<WithdrawResult, "ok">, email: string): Response {
  switch (result) {
    case "no-match":
      return Response.json({ error: "Match not found" }, { status: 404 });
    case "no-rosters":
      return Response.json(
        { error: "Invalid match data, missing participant fields" },
        { status: 400 }
      );
    case "no-user-season":
      return Response.json({ error: "User not found" }, { status: 404 });
    case "not-signed-up":
      return Response.json({ error: `${email} is not a participant in this match` }, { status: 400 });
  }
}

/** Takes the signed-in user off a game's roster (`participantType` side). */
export async function POST(req: Request) {
  try {
    const { matchId, seasonId, participantType } = await req.json();
    if (!(await getSessionToken())) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    }
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }
    if (!matchId || !participantType || !seasonId) {
      return Response.json({ error: "Missing required parameters" }, { status: 400 });
    }
    // The side is written as a field name on the match (D21).
    if (!isRosterSide(participantType)) {
      return Response.json({ error: "Invalid participantType" }, { status: 400 });
    }

    const result = await withdraw({
      email: session.email,
      seasonId: String(seasonId),
      matchId,
      side: participantType,
    });
    if (result !== "ok") {
      return refusal(result, session.email);
    }
    return Response.json({
      message: "Successfully unregistered and updated your matches!",
    });
  } catch (err) {
    console.error("Error leaving a match:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
