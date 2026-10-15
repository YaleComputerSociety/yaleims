import { getSession, getSessionToken, hasAnyRole } from "@/server/session";
import { getCurrentSeason } from "@/server/data/seasons";
import { createBracket } from "@/server/services/brackets";

/** { bracketData: { sport, matches } }: creates this season's bracket for a sport (admin/dev). */
export async function POST(req: Request) {
  try {
    const { bracketData } = await req.json();
    if (!(await getSessionToken())) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    }
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }
    if (!hasAnyRole(session, ["admin", "dev"])) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (!bracketData || !bracketData.sport || !bracketData.matches) {
      return Response.json(
        { error: "Missing or invalid 'bracketData' parameter." },
        { status: 400 }
      );
    }
    const sport = String(bracketData.sport);
    const seasonId = (await getCurrentSeason())?.year;
    if (!seasonId) {
      return Response.json({ error: "Current season not found." }, { status: 500 });
    }

    const result = await createBracket(seasonId, sport, bracketData.matches);
    if (result === "exists") {
      return Response.json({ error: `Bracket for '${sport}' already exists.` }, { status: 409 });
    }
    if (result === "no-counter") {
      return Response.json({ error: "Cannot find next match ID" }, { status: 500 });
    }
    if (result === "id-taken") {
      return Response.json(
        { error: "A new match id is already in use (check counters/matches); nothing was created." },
        { status: 409 }
      );
    }
    return Response.json({ message: `Bracket for '${sport}' created successfully.` });
  } catch (err) {
    console.error("Error creating bracket:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
