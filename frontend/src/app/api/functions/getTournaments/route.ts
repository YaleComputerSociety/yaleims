export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");

  const url = new URL(
    "https://us-central1-yims-125a2.cloudfunctions.net/getTournaments"
  );
  if (year) url.searchParams.set("year", year);

  const response = await fetch(url.toString(), { method: "GET" });

  if (!response.ok) {
    return new Response(await response.text(), { status: response.status });
  }

  const data = await response.json();
  return Response.json(data);
}
