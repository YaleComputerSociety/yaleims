import { getSession, getSessionToken } from "@/server/session";
import { withdraw, type WithdrawResult } from "@/server/services/signups";

const ROSTER_SIDES = ["home_college_participants", "away_college_participants"];

function refusal(result: Exclude<WithdrawResult, "ok">, email: string): Response {
  switch (result) {
    case "no-match":
      return Response.json({ error: "Match not found" }, { status: 404 });
    case "not-signed-up":
      return Response.json({ error: `${email} is not a participant in this match` }, { status: 400 });
    case "started":
      return Response.json({ error: "Withdrawal is closed: the game has started" }, { status: 400 });
    case "removed":
      return Response.json({ error: "Your captain already took you off this game" }, { status: 400 });
  }
}

/** Takes the signed-in user off a game's roster, until the game starts (D34). */
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
    // Still required and checked (D21); the entry is found by the player.
    if (!ROSTER_SIDES.includes(participantType)) {
      return Response.json({ error: "Invalid participantType" }, { status: 400 });
    }

    const result = await withdraw(String(seasonId), String(matchId), session.email);
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
