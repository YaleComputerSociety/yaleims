import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { casLoginUrl } from "@/server/yaleLogin";

/** Sends the visitor to Yale CAS; after login they come back to ?from (a page of this site). */
export const GET = route(async (req) => NextResponse.redirect(casLoginUrl(new URL(req.url).searchParams.get("from"))));
