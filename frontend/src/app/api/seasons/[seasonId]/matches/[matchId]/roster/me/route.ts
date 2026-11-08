import { ApiError } from "@/lib/api/core";
import { requireViewer } from "@/server/auth";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { noContent, route } from "@/server/http";
import { joinSeasonOnVisit } from "@/server/services/accounts";
import { signUp, withdraw, type SignUpResult, type WithdrawResult } from "@/server/services/signups";

type Params = { seasonId: string; matchId: string };

const SIGN_UP_REFUSALS: Record<Exclude<SignUpResult, "ok" | "already-signed-up">, ApiError> = {
  "no-match": new ApiError("not-found", "No such game this season."),
  "not-in-season": new ApiError("forbidden", "You weren't a player that season."),
  unassigned: new ApiError("forbidden", "Signing yourself up needs a verified residential college: see Profile → College affiliation."),
  "other-college": new ApiError("forbidden", "You can only sign up for your college's games."),
  started: new ApiError("conflict", "Sign-up is closed: the game has started."),
  cancelled: new ApiError("conflict", "This game is cancelled."),
  removed: new ApiError("forbidden", "Your captain took you off this game."),
};

/**
 * Signs the caller up for the game, on their college's side, until it starts
 * (D34); already signed up is fine. A student who hasn't joined the current
 * season yet joins it first, with the college the directory gives (D30).
 */
export const PUT = route<Params>(async (req, { params }) => {
  const { seasonId, matchId } = await params;
  const viewer = await requireViewer();
  let result = await signUp(seasonId, matchId, viewer.userId);
  if (result === "not-in-season" && seasonId === (await getCurrentSeasonId())) {
    await joinSeasonOnVisit(seasonId, viewer.userId, viewer.netid);
    result = await signUp(seasonId, matchId, viewer.userId);
  }
  if (result !== "ok" && result !== "already-signed-up") throw SIGN_UP_REFUSALS[result];
  return noContent();
});

const WITHDRAW_REFUSALS: Record<Exclude<WithdrawResult, "ok" | "not-signed-up">, ApiError> = {
  "no-match": new ApiError("not-found", "No such game this season."),
  started: new ApiError("conflict", "Withdrawing is closed: the game has started."),
  removed: new ApiError("conflict", "Your captain already took you off this game."),
};

/** Takes the caller off the game until it starts (D34), whatever their college; not on it is fine. */
export const DELETE = route<Params>(async (req, { params }) => {
  const { seasonId, matchId } = await params;
  const viewer = await requireViewer();
  const result = await withdraw(seasonId, matchId, viewer.userId);
  if (result !== "ok" && result !== "not-signed-up") throw WITHDRAW_REFUSALS[result];
  return noContent();
});
