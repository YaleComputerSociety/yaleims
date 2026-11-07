import { NextResponse } from "next/server";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { logFailure, route } from "@/server/http";
import { consumeLogin, LoginFailure, startLogin } from "@/server/login";
import { signIn } from "@/server/services/accounts";
import { getIdentity, setSessionCookie } from "@/server/session";
import { siteUrl, validateTicket, yaliesProfile } from "@/server/yaleLogin";

/**
 * Where Yale CAS sends people back (the URL registered with CAS). With a
 * browser-bound, single-use attempt and valid ticket: signs them in (the first
 * login creates the account and season player doc, D30), sets the session cookie and
 * returns them to the stored local path. A bare callback starts a fresh attempt.
 * A failed sign-in ends on a page, never on an API error (failedLogin).
 */
export const GET = route(async (req) => {
  const params = new URL(req.url).searchParams;
  if (!params.has("ticket") && !params.has("state")) return startLogin(params.get("from"));
  try {
    return await finishLogin(params);
  } catch (error) {
    return failedLogin(req, error);
  }
});

async function finishLogin(params: URLSearchParams): Promise<NextResponse> {
  const ticket = params.get("ticket");
  if (!ticket || params.getAll("ticket").length !== 1 || params.getAll("state").length !== 1) {
    throw new LoginFailure("expired");
  }
  const state = params.get("state")!;
  const from = await consumeLogin(state);

  const netid = (await validateTicket(ticket, state))?.toLowerCase();
  if (!netid) throw new LoginFailure("refused");
  const profile = await yaliesProfile(netid);
  if (!profile || !profile.email.endsWith("@yale.edu")) throw new LoginFailure("no-profile");
  const seasonId = await getCurrentSeasonId();
  if (!seasonId) throw new Error("config/app has no current season");

  const userId = await signIn(profile, netid, seasonId);
  const res = NextResponse.redirect(siteUrl(from));
  setSessionCookie(res, { userId, netid });
  return res;
}

/**
 * Someone already signed in goes home: a stale second tab or a refreshed
 * callback. Anyone else gets a page saying what happened, with a "Sign in
 * again" button. Never an automatic restart: with cookies blocked, that
 * would loop through CAS. An existing session is never replaced.
 */
async function failedLogin(req: Request, error: unknown): Promise<NextResponse> {
  const problem = error instanceof LoginFailure ? error.problem : "unavailable";
  if (!(error instanceof LoginFailure)) await logFailure(req, error);
  if (await getIdentity()) return NextResponse.redirect(siteUrl("/"));
  return NextResponse.redirect(siteUrl(`/sign-in-failed?problem=${problem}`));
}
