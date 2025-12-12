import { db } from "../../../../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { userTokenHasRoles } from "@src/utils/auth-helpers";

export async function GET(req: Request) {
  try {
    const hasRoles = await userTokenHasRoles(["dev"]);

    if (!hasRoles) {
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

    const usersRef = collection(db, "users");
    let usersQuery;

    if (college === "Admin") {
      // Get all users across all colleges who have "admin" in their mRoles
      usersQuery = query(usersRef, where("mRoles", "array-contains", "admin"));
    } else if (college === "Dev") {
      // Get all users across all colleges who have "dev" in their mRoles
      usersQuery = query(usersRef, where("mRoles", "array-contains", "dev"));
    } else {
      // Get users with matching college who have "captain" or "college_rep" roles
      usersQuery = query(
        usersRef,
        where("college", "==", college),
        where("mRoles", "array-contains-any", ["captain", "college_rep"])
      );
    }

    const querySnapshot = await getDocs(usersQuery);
    const specialUsers = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return new Response(JSON.stringify({ users: specialUsers }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
