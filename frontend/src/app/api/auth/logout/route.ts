import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { clearSessionCookie } from "@/server/session";

/** Ends the session: clears the cookie, 204 (the page then goes home). Signed out already: the same. */
export const POST = route(async () => {
  const res = new NextResponse(null, { status: 204 });
  clearSessionCookie(res);
  return res;
});
