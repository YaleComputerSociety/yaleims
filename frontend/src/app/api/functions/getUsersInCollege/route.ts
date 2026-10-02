import { cookies } from "next/headers";
import { functionUrl } from "@/utils/functionUrls";

export async function GET(req: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get("token");
    if (!token) {
        return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401 });
    }
    const url = new URL(req.url);
    const wantCaptains = url.searchParams.get("wantCaptains")
    const response= await fetch(
        `${functionUrl("getUsersInCollege")}?wantCaptains=${wantCaptains}`,
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.value}` } }
    );

    if (!response.ok) {
        return new Response(await response.text(), { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
}
