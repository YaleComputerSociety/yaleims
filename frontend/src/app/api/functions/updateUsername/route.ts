import { getSession, getSessionToken } from "@/server/session";
import { changeUsername } from "@/server/data/users";

const MIN_LENGTH = 3;
const MAX_LENGTH = 20;
const VALID_FORMAT = /^[a-zA-Z0-9_]+$/;

/** { newUsername }: renames the signed-in user. Errors are plain text. */
export async function POST(req: Request) {
  try {
    const { newUsername: raw = "" } = await req.json().catch(() => ({}));
    const newUsername = String(raw).trim();
    if (!(await getSessionToken())) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    }
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    if (!newUsername) {
      return new Response("Missing 'userId' or 'newUsername' in request body ", {
        status: 400,
      });
    }
    if (newUsername.length < MIN_LENGTH || newUsername.length > MAX_LENGTH) {
      return new Response(
        `Username must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters long`,
        { status: 400 }
      );
    }
    if (!VALID_FORMAT.test(newUsername)) {
      return new Response(
        "Username can only contain letters, numbers, and underscores, and no spaces",
        { status: 400 }
      );
    }

    const result = await changeUsername(session.email, newUsername);
    if (result === "taken") {
      return new Response("Username is already taken", { status: 409 });
    }
    if (result === "no-user") {
      return new Response("User not found", { status: 404 });
    }
    return Response.json({ success: true, username: newUsername });
  } catch (err) {
    console.error("Error updating username:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
