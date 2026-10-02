import { functionUrl } from "@/utils/functionUrls";

export async function GET(req: Request) {
    const response= await fetch(
        functionUrl("getSeasons")
    );

    if (!response.ok) {
        return new Response(await response.text(), { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
}
