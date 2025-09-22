import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { sport } = await req.json();
    const cookieStore = await cookies();
    const token = cookieStore.get("token");
    if (!token) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
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

    let data;
    try {
      data = await response.json();
    } catch {
      const text = await response.text();
      data = { error: text };
    }

    if (!response.ok) {
      return Response.json(data, { status: response.status });
    }
    return Response.json(data);
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
