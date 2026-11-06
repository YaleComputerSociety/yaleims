import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/core";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { route } from "@/server/http";
import { consumeLogin, invalidLogin, startLogin } from "@/server/login";
import { signIn } from "@/server/services/accounts";
import { setSessionCookie } from "@/server/session";
import { siteUrl, validateTicket, yaliesProfile } from "@/server/yaleLogin";

/**
 * Where Yale CAS sends people back (the URL registered with CAS). With a
 * browser-bound, single-use attempt and valid ticket: signs them in (the first
 * login creates the account and season player doc, D30), sets the session cookie and
 * returns them to the stored local path. A bare callback starts a fresh attempt.
 */
export const GET = route(async (req) => {
  const params = new URL(req.url).searchParams;
  const ticket = params.get("ticket");
  if (!params.has("ticket") && !params.has("state")) return startLogin(params.get("from"));
  if (!ticket || params.getAll("ticket").length !== 1 || params.getAll("state").length !== 1) throw invalidLogin();
  const state = params.get("state")!;
  const from = await consumeLogin(state);

  const netid = await validateTicket(ticket, state);
  if (!netid) throw new ApiError("unauthenticated", "Yale login failed. Please try again.");
  const profile = await yaliesProfile(netid);
  if (!profile) throw new ApiError("forbidden", "We couldn't find your Yale profile, so you can't sign in.");
  if (!profile.email.endsWith("@yale.edu")) throw new ApiError("forbidden", "You must use a Yale email to sign in.");
  const seasonId = await getCurrentSeasonId();
  if (!seasonId) throw new Error("config/app has no current season");

  await signIn(profile, netid, seasonId);
  const res = NextResponse.redirect(siteUrl(from));
  const name = `${profile.first_name} ${profile.last_name}`;
  setSessionCookie(res, { email: profile.email, netid, name, college: profile.college ?? null });
  return res;
});
