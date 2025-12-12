import { db } from "../../../../../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { userTokenHasRoles } from "@src/utils/auth-helpers";

export async function PUT(req: Request) {
  try {
    const hasRoles = await userTokenHasRoles(["dev"]);

    if (!hasRoles) {
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
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
      });
    }

    if (!roles.includes("captain")) {
    }

    // Update user roles and sports
    await updateDoc(userRef, {
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
