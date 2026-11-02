import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/core";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { route } from "@/server/http";
import { signIn } from "@/server/services/accounts";
import { setSessionCookie } from "@/server/session";
import { casLoginUrl, returnPath, siteUrl, validateTicket, yaliesProfile } from "@/server/yaleLogin";

/**
 * Where Yale CAS sends people back (the URL registered with CAS). With a
 * valid ticket: signs them in (the first login creates the account, the
 * first of a season their player doc, D30), sets the session cookie and
 * returns them to ?from. Without a ticket: back to CAS.
 */
export const GET = route(async (req) => {
  const params = new URL(req.url).searchParams;
  const from = params.get("from");
  const ticket = params.get("ticket");
  if (!ticket) return NextResponse.redirect(casLoginUrl(from));

  const netid = await validateTicket(ticket, from);
  if (!netid) throw new ApiError("unauthenticated", "Yale login failed. Please try again.");
  const profile = await yaliesProfile(netid);
  if (!profile) throw new ApiError("forbidden", "We couldn't find your Yale profile, so you can't sign in.");
  if (!profile.email.endsWith("@yale.edu")) throw new ApiError("forbidden", "You must use a Yale email to sign in.");
  const seasonId = await getCurrentSeasonId();
  if (!seasonId) throw new Error("config/app has no current season");

  const account = await signIn(profile, seasonId);
  const res = NextResponse.redirect(siteUrl(returnPath(from)));
  const name = `${profile.first_name} ${profile.last_name}`;
  // The old routes still read roles from the cookie (Phase 2D step 6 drops them).
  setSessionCookie(res, { name, netid, email: profile.email, ...account });
  return res;
});
