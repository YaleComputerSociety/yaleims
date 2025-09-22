import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { sport } = await req.json();
  const cookieStore = await cookies();
  const token = cookieStore.get("token");
  if (!token) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401,
    });
  }
  const response = await fetch(
    "https://us-central1-yims-125a2.cloudfunctions.net/deleteBracket",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({ sport }),
    }
  );

  if (!response.ok) {
    return new Response(await response.text(), { status: response.status });
  }

  const data = await response.json();
  return Response.json(data);
}
