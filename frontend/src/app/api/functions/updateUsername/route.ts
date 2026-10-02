import { functionUrl } from "@/utils/functionUrls";
import { cookies } from "next/headers";

export async function GET(req: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get("token");
    const url = new URL(req.url);
    const newUsername = url.searchParams.get("newUsername") || "";
    if (!token) {
        return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401 });
    }
    const response = await fetch(
        functionUrl("updateUsername"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token.value}`
          },
          body: JSON.stringify({
            newUsername: newUsername.trim(),
          }),
        }
      );

    if (!response.ok) {
        return new Response(await response.text(), { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
}
