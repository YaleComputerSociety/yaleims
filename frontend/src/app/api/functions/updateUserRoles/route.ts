import { updateUserRoles } from "@/server/data/users";
import { getSession, hasAnyRole } from "@/server/session";

export async function PUT(req: Request) {
  try {
    if (!hasAnyRole(await getSession(), ["dev"])) {
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

    const updated = await updateUserRoles(
      userId,
      roles,
      roles.includes("captain") ? sportsCaptainOf : []
    );
    if (!updated) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
      });
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
