import { adminDb } from "../../../../../lib/firebaseAdmin";
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

    // Get document reference
    const userRef = adminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
      });
    }

    // Update user roles and sports
    await userRef.update({
      mRoles: roles,
      sportsCaptainOf: roles.includes("captain") ? sportsCaptainOf : [],
    });

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
