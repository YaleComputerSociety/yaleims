import { collegeIdOfName } from "@/lib/colleges";
import { getSession, getSessionToken, hasAnyRole } from "@/server/session";
import { listColleges } from "@/server/data/colleges";
import { setMvp } from "@/server/data/mvps";

/** A college rep names a week's MVP for a college (residentialCollege: its name or id). */
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
    if (!hasAnyRole(session, ["college_rep"])) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (!season || !residentialCollege || !weekId || !mvpEmail || !mvpFName || !mvpLName) {
      return Response.json({ error: "Missing required field(s)" }, { status: 400 });
    }
    const week = /^week_(\d+)$/.exec(String(weekId))?.[1];
    const collegeId = collegeIdOfName(await listColleges(String(season)), residentialCollege);
    if (!week || !collegeId) {
      return Response.json({ error: "Invalid weekId or residentialCollege" }, { status: 400 });
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
