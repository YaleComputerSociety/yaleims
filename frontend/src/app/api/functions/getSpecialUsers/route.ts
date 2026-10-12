import { getSession, hasAnyRole } from "@/server/session";
import {
  listCollegeUsersWithAnyRole,
  listUsersWithRole,
} from "@/server/data/users";
import type { SpecialUsersResponse } from "@/types/api";

export async function GET(req: Request) {
  try {
    if (!hasAnyRole(await getSession(), ["dev"])) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 403,
      });
    }

    const { searchParams } = new URL(req.url);
    const college = searchParams.get("college");

    if (!college) {
      return new Response(
        JSON.stringify({ error: "Missing college parameter" }),
        {
          status: 400,
        }
      );
    }

    // "Admin" and "Dev" are pseudo-colleges listing those roles everywhere;
    // a real college lists its captains and college reps.
    const specialUsers =
      college === "Admin"
        ? await listUsersWithRole("admin")
        : college === "Dev"
          ? await listUsersWithRole("dev")
          : await listCollegeUsersWithAnyRole(college, ["captain", "college_rep"]);

    return new Response(JSON.stringify({ users: specialUsers } satisfies SpecialUsersResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
