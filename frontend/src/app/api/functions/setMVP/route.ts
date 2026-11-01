import { collegeIdOfName } from "@/lib/colleges";
import { getSession, getSessionToken, hasAnyRole } from "@/server/session";
import { listColleges } from "@/server/data/colleges";
import { setMvp } from "@/server/data/mvps";
import { getPlayer } from "@/server/data/players";

/**
 * Names a week's MVP for a college (residentialCollege: its name or id): a
 * rep for their own college, an admin for any (D42). The rep is checked on
 * their player doc, not the session.
 */
export async function POST(req: Request) {
  try {
    const { season, weekId, residentialCollege, mvpEmail, mvpFName, mvpLName } =
      await req.json();
    if (!(await getSessionToken())) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    }
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }
    if (!season || !residentialCollege || !weekId || !mvpEmail || !mvpFName || !mvpLName) {
      return Response.json({ error: "Missing required field(s)" }, { status: 400 });
    }
    const week = /^week_(\d+)$/.exec(String(weekId))?.[1];
    const collegeId = collegeIdOfName(await listColleges(String(season)), residentialCollege);
    if (!week || !collegeId) {
      return Response.json({ error: "Invalid weekId or residentialCollege" }, { status: 400 });
    }
    if (!hasAnyRole(session, ["admin", "dev"])) {
      const me = await getPlayer(String(season), session.email);
      if (!me?.roles.includes("college_rep") || me.collegeId !== collegeId) {
        return Response.json({ error: "Only the college's rep or an admin can name its MVPs" }, { status: 403 });
      }
    }

    await setMvp(String(season), collegeId, {
      week: Number(week),
      playerId: String(mvpEmail),
      name: `${mvpFName} ${mvpLName}`,
      awardedBy: session.email,
    });
    return Response.json({ success: true, weekId });
  } catch (err) {
    console.error("Error setting MVP:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
