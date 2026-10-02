import { functionUrl } from "@/utils/functionUrls";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const forwardParams = new URLSearchParams(searchParams);
    if (!forwardParams.get("seasonId")) {
        return Response.json({ error: "seasonId is required" }, { status: 400 });
    }

    const response = await fetch(
        `${functionUrl("getMatchesPaginatedv2")}?${forwardParams.toString()}`
    );

    if (!response.ok) {
        return new Response(await response.text(), { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
}
