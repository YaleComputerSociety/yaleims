import { getSession, getSessionToken, hasAnyRole } from "@/server/session";
import { setCollegeMvp } from "@/server/data/mvps";

/** A college rep names a week's MVP for a college. */
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

    await setCollegeMvp(String(season), String(residentialCollege), String(weekId), String(mvpEmail), {
      fname: mvpFName,
      lname: mvpLName,
    });
    return Response.json({ success: true, weekId });
  } catch (err) {
    console.error("Error setting MVP:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
