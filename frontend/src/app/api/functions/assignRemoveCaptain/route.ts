import { getSession, getSessionToken } from "@/server/session";
import { setSportCaptain } from "@/server/data/users";

/**
 * { email, sport, assign | remove }: makes a user captain of a sport, or not.
 * Any signed-in user may call it today (see NEXT-STEPS backlog).
 */
export async function POST(req: Request) {
  try {
    const { email, sport, assign, remove } = await req.json();
    if (!(await getSessionToken())) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    }
    if (!(await getSession())) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }
    if (!email || !sport) {
      return Response.json({ error: "Missing email or sport" }, { status: 400 });
    }
    if (!assign && !remove) {
      return Response.json(
        { error: "Must specify either assign or remove" },
        { status: 400 }
      );
    }

    if (!(await setSportCaptain(String(email), sport, { assign, remove }))) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (err: any) {
    console.error("Error assigning/removing captain:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
