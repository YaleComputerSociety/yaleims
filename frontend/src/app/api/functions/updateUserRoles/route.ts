import { actorOf } from "@/server/data/auditLog";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { listSports } from "@/server/data/sports";
import { setUserRoles } from "@/server/services/roles";
import { getSession, hasAnyRole } from "@/server/session";

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || !hasAnyRole(session, ["dev"])) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 403,
      });
    }

    const body = await req.json();

    const userId: string = body.userId;
    const roles: string[] = body.roles;
    const sportsCaptainOf: string[] = body.sportsCaptainOf;

    if (!userId || !roles) {
      return new Response(
        JSON.stringify({ error: "Missing userId or roles in body" }),
        {
          status: 400,
        }
      );
    }

    const seasonId = await getCurrentSeasonId();
    if (!seasonId) {
      return new Response(JSON.stringify({ error: "current season not found" }), {
        status: 500,
      });
    }
    // The old page names the sports a captain leads; "captain" in roles turns them on.
    const sports = await listSports(seasonId);
    const names = roles.includes("captain") && Array.isArray(sportsCaptainOf) ? sportsCaptainOf : [];
    const captainOf = names.flatMap((name) => sports.filter((s) => s.name === name).map((s) => s.id));
    const result =
      captainOf.length < names.length
        ? "unknown-sport"
        : await setUserRoles(seasonId, userId, roles, captainOf, actorOf(session));
    const refusals = {
      "no-user": [404, "User not found"],
      "not-in-season": [409, "User hasn't joined this season yet (they join at their next login)"],
      "no-college": [409, "User has no college this season"],
      "unknown-sport": [400, "Unknown sport in sportsCaptainOf"],
    } as const;
    if (result !== "ok") {
      const [status, error] = refusals[result];
      return new Response(JSON.stringify({ error }), { status });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "User roles updated successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
