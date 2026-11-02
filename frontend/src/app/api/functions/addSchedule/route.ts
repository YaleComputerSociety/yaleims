import { getSession, getSessionToken, hasAnyRole } from "@/server/session";
import { actorOf } from "@/server/data/auditLog";
import type { NewMatch } from "@/lib/api/matches";
import { findSportByName } from "@/server/data/sports";
import { addSchedule } from "@/server/services/schedule";

const MAX_MATCHES = 499;

/** { schedule: { season, sport, matches } }: adds a season's games (admin/dev; audit-logged). */
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

    // The old upload names the sport and the fields the pre-v3 way.
    const sport = await findSportByName(String(schedule.season), String(schedule.sport));
    const games = schedule.matches.map((g: Record<string, string | undefined>) => ({
      startsAt: g.timestamp,
      homeCollegeId: g.homeCollege,
      awayCollegeId: g.awayCollege,
      venue: g.location ?? null,
      venueDetail: g.locationExtra ?? null,
    })) as NewMatch[];
    const result = sport
      ? await addSchedule(String(schedule.season), sport.id, games, actorOf(session))
      : ({ status: "unknown-sport" } as const);
    if (result.status === "unknown-sport") {
      return Response.json({ error: `Unknown sport: ${schedule.sport}` }, { status: 400 });
    }
    if (result.status === "bad-rows") {
      return Response.json(
        { error: `Nothing was added. ${result.problems.join("; ")}` },
        { status: 400 }
      );
    }
    return Response.json({ success: true });
  } catch (err: any) {
    console.error("Error adding schedule:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
