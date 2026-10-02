import { functionUrl } from "@/utils/functionUrls";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { schedule } = await req.json();
  const cookieStore = await cookies();
  const token = cookieStore.get("token");
  if (!token) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401,
    });
  }

  const response = await fetch(
    functionUrl("addSchedule"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({ schedule }),
    }
  );

  if (!response.ok) {
    return new Response(await response.text(), { status: response.status });
  }

  const data = await response.json();
  return Response.json(data);
}
