import { getSession, getSessionToken, hasAnyRole } from "@/server/session";
import { addScheduledMatches } from "@/server/data/matches";

const MAX_MATCHES = 499;

/** { schedule: { season, sport, matches } }: adds a season's games (admin/dev). */
export async function POST(req: Request) {
  try {
    const { schedule } = await req.json();
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
    if (!schedule || !Array.isArray(schedule.matches) || !schedule.sport || !schedule.season) {
      return Response.json({ error: "Invalid schedule format" }, { status: 400 });
    }
    if (schedule.matches.length > MAX_MATCHES) {
      return Response.json(
        { error: `Too many matches in one upload (max ${MAX_MATCHES}). Split the file.` },
        { status: 400 }
      );
    }

    const result = await addScheduledMatches(String(schedule.season), schedule.sport, schedule.matches);
    if (result === "no-counter") {
      return Response.json({ error: "Cannot find next match ID" }, { status: 500 });
    }
    if (result === "id-taken") {
      return Response.json(
        { error: "A new match id is already in use (check counters/matches); nothing was added." },
        { status: 409 }
      );
    }
    return Response.json({ success: true });
  } catch (err: any) {
    console.error("Error adding schedule:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
