import { functionUrl } from "@/utils/functionUrls";
import { getSessionToken } from "@/server/session";
import { getMatch } from "@/server/data/matches";

/** The full match docs of the user's upcoming games (timestamps as ISO strings). */
export async function GET(req: Request) {
  const token = await getSessionToken();
  if (!token) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401,
    });
  }
  const url = new URL(req.url);
  const seasonId = url.searchParams.get("seasonId");
  if (!seasonId) {
    return Response.json({ error: "seasonId is required" }, { status: 400 });
  }
  // The function verifies the token and returns the user's upcoming sign-ups.
  const response = await fetch(
    `${functionUrl("getUserMatches")}?seasonId=${seasonId}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    return new Response(await response.text(), { status: response.status });
  }

  const signups: { id: number | string }[] = await response.json();
  const matches = await Promise.all(
    signups.map(async ({ id }) => {
      const match = await getMatch(seasonId, id);
      return match && { ...match, timestamp: match.timestamp?.toDate().toISOString() };
    })
  );
  return Response.json(matches);
}
