export async function GET(req: Request) {
    const url = new URL(req.url);
    const seasonId = url.searchParams.get("seasonId") ?? "2025-2026";
    const response= await fetch(
        `https://getseasons-65477nrg6a-uc.a.run.app?seasonId=${seasonId}`
    );

    if (!response.ok) {
        return new Response(await response.text(), { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
}
