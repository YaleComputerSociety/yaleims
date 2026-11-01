import { getCurrentSeasonId } from "@/server/data/seasons";
import { getSession, getSessionToken } from "@/server/session";
import { joinSeason } from "@/server/services/accounts";
import { signUp, type SignUpResult } from "@/server/services/signups";

const ROSTER_SIDES = ["home_college_participants", "away_college_participants"];

function refusal(result: Exclude<SignUpResult, "ok">, email: string): Response {
  switch (result) {
    case "no-match":
      return Response.json({ error: "Match not found" }, { status: 404 });
    case "already-signed-up":
      return Response.json({ error: `${email} is already a participant` }, { status: 400 });
    case "started":
      return Response.json({ error: "Sign-up is closed: the game has started" }, { status: 400 });
    case "not-in-season":
      return Response.json({ error: "Sign in again to join this season" }, { status: 403 });
    case "other-college":
      return Response.json({ error: "You can only sign up for your college's games" }, { status: 403 });
    case "removed":
      return Response.json({ error: "Your captain took you off this game" }, { status: 403 });
  }
}

/**
 * Signs the signed-in user up for a game (D34): their own college's side,
 * until the game starts. `participantType` (the side) is still required and
 * checked (D21), but the side comes from the player's college.
 */
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
    if (!ROSTER_SIDES.includes(participantType)) {
      return Response.json({ error: "Invalid participantType" }, { status: 400 });
    }

    let result = await signUp(String(seasonId), String(matchId), session.email);
    // A session from before the season (or the v3 cutover) whose page hasn't
    // re-verified: join the season as /api/auth/verify would (D30), then retry.
    if (result === "not-in-season" && String(seasonId) === (await getCurrentSeasonId())) {
      await joinSeason(String(seasonId), session.email, session.name, session.college);
      result = await signUp(String(seasonId), String(matchId), session.email);
    }
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
