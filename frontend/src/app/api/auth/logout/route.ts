import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { SESSION_COOKIE, clearSessionCookie, secureCookies } from "@/server/session";

/** Ends the session: clears the cookie, 204 (the page then goes home). Signed out already: the same. */
export const POST = route(async () => {
  const res = new NextResponse(null, { status: 204 });
  clearSessionCookie(res);
  return res;
});

/** The old pages' logout (a GET that redirects to the Hub); goes with them in Phase 2D step 6. */
export async function GET(): Promise<NextResponse> {
  const BASE_URL = process.env.BASE_URL;
  if (!BASE_URL) {
    throw new Error("Please define the BASE_URL environment variable");
  }
  const response = NextResponse.redirect(`${process.env.BASE_URL}/hub`);

  response.cookies.delete({
    name: SESSION_COOKIE,
    secure: secureCookies,
    path: "/",
    httpOnly: true,
    sameSite: "strict",
  });

  return response;
}
