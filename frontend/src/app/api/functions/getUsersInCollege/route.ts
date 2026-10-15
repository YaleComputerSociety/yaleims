import { getSession, getSessionToken, hasAnyRole } from "@/server/session";
import { listCollegeUsers } from "@/server/data/users";
import type { UsersInCollegeResponse } from "@/types/api";

/**
 * The college rep's own college: all its users, plus its captains when
 * ?wantCaptains=true.
 */
export async function GET(req: Request) {
  try {
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

    const users = await listCollegeUsers(session.college);
    if (users.length === 0) {
      return Response.json({ error: "No users found" }, { status: 404 });
    }
    if (new URL(req.url).searchParams.get("wantCaptains") !== "true") {
      return Response.json({ users } satisfies UsersInCollegeResponse);
    }

    const captains = users
      .filter((u) => u.mRoles?.includes("captain") || u.role === "captain")
      .map((u) => ({
        firstName: u.firstname,
        lastName: u.lastname,
        email: u.email,
        sportsCaptainOf: u.sportsCaptainOf,
      }));
    return Response.json({ users, captains } satisfies UsersInCollegeResponse);
  } catch (err) {
    console.error("Error fetching users in college:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
