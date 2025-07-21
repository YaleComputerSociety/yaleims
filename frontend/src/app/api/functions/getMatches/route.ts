import { cookies } from "next/headers";

export async function GET(req: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get("token");
    if (!token) {
        return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const forwardParams = new URLSearchParams(searchParams);
    if (!forwardParams.has("seasonId")) {
        forwardParams.set("seasonId", "2025-2026");
    }

    const response = await fetch(
        `https://getmatchespaginatedv2-65477nrg6a-uc.a.run.app?${forwardParams.toString()}`
    );

    if (!response.ok) {
        return new Response(await response.text(), { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
}
