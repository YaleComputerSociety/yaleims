import { functionUrl } from "@/utils/functionUrls";
import { getSession } from "@/server/session";

// Paged matches for the scores and schedules pages. Signed-in users only, on
// purpose for now: the pages show a "Sign in" prompt on 401. What logged-out
// visitors may see is an open product decision (the games page is public).
// Not a security boundary: match data is publicly readable.
export async function GET(req: Request) {
    if (!(await getSession())) {
        return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const forwardParams = new URLSearchParams(searchParams);
    if (!forwardParams.get("seasonId")) {
        return Response.json({ error: "seasonId is required" }, { status: 400 });
    }

    const response = await fetch(
        `${functionUrl("getMatchesPaginated")}?${forwardParams.toString()}`
    );

    if (!response.ok) {
        return new Response(await response.text(), { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
}
