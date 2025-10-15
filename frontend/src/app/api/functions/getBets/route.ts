import { cookies } from "next/headers";

export async function GET(req: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get("token");
    if (!token) {
        return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401 });
    }
    const url = new URL(req.url);
    const seasonId = url.searchParams.get("seasonId") ?? "2025-2026";
    const history = url.searchParams.get("history")
    const pending = url.searchParams.get("pending");
    const response= await fetch(
        `https://getbets-65477nrg6a-uc.a.run.app?seasonId=${seasonId}&history=${history}&pending=${pending}`,
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.value}` } }
    );

    if (!response.ok) {
        return new Response(await response.text(), { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
}
