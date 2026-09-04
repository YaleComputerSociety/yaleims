import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token");
    if (!token) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    }
    const { betAmount, betArray, totalOdds } = await req.json();
    const seasonId = new URL(req.url).searchParams.get("seasonId");
    if (!seasonId) {
      return Response.json({ error: "seasonId is required" }, { status: 400 });
    }
    const response = await fetch(`https://addbet-65477nrg6a-uc.a.run.app?seasonId=${seasonId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({ betAmount, betArray, totalOdds }),
    });

    const data = await response.json();
    return Response.json(data);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
