export async function GET(req: Request) {
    const response= await fetch(
        "https://getseasons-65477nrg6a-uc.a.run.app"
    );

    if (!response.ok) {
        return new Response(await response.text(), { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
}
