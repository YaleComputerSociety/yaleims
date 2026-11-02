// How games, places and records read on the pages: pure text helpers shared by
// the match lists (games, schedules, scores, profile, Hub).
import type { Match } from "./api/matches";
import { collegeName } from "./colleges";

// ── Places and ratios ──────────────────────────────────────────────────────

/** 1 → "1st", 12 → "12th", 23 → "23rd"; "" for none. */
export function getPlace(place: number | undefined): string {
  if (place === undefined) return "";
  const lastTwo = place % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${place}th`;
  return `${place}${{ 1: "st", 2: "nd", 3: "rd" }[place % 10] ?? "th"}`;
}

/** A bar width for part of a whole, e.g. "40%"; a sliver ("2%") for none, so the bar shows. */
export function getRatioAsString(part: number | undefined, whole: number | undefined): string {
  if (part === undefined || whole === undefined) return "0%";
  const ratio = (part / whole) * 100;
  return ratio == 0 ? "2%" : `${ratio}%`;
}

// ── Games ──────────────────────────────────────────────────────────────────

/** A side's name: the college's, or "TBD" while a bracket game waits for a winner. */
export const sideName = (collegeId: string | null) => collegeName(collegeId) ?? "TBD";

/**
 * The game's round as the lists label it. Tournament games reuse the playoff
 * rounds ("Playoff", "Quarterfinal", …), so they read "Round 1" and
 * "3rd Place Game" instead of looking like ordinary playoff games.
 */
export function matchTypeLabel(match: Pick<Match, "stage" | "round">, inTournament: boolean): string {
  const round = match.stage === "regular" ? "Regular" : (match.round ?? "Playoff");
  if (!inTournament) return round === "Regular" ? "Regular Season" : `${round} Round`;
  if (round === "Playoff") return "Round 1";
  if (round === "Third Place") return "3rd Place Game";
  return round;
}

/** The points a side earned: the game's points for a win, half each for a draw or a double forfeit; null if none. */
export function pointsEarned(match: Pick<Match, "result" | "pointsForWin">, side: "home" | "away"): number | null {
  const outcome = match.result?.outcome;
  if (outcome === "draw" || outcome === "double_forfeit") return match.pointsForWin / 2;
  return outcome === side ? match.pointsForWin : null;
}

/** The games grouped by their (local) start day, "yyyy-mm-dd", in the order given. */
export function groupByDay<M extends Pick<Match, "startsAt">>(matches: M[]): Map<string, M[]> {
  const days = new Map<string, M[]>();
  for (const match of matches) {
    const day = new Date(match.startsAt).toLocaleDateString("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });
    days.set(day, [...(days.get(day) ?? []), match]);
  }
  return days;
}

/** A Google Calendar link that adds the game as a one-hour event. */
export function calendarLink(
  match: Pick<Match, "startsAt" | "homeCollegeId" | "awayCollegeId" | "venue" | "venueDetail">,
  sportName: string
): string {
  const start = new Date(match.startsAt);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    text: `IM ${sportName}: ${match.homeCollegeId ?? "TBD"} vs. ${match.awayCollegeId ?? "TBD"}`,
    details: `Intramural ${sportName} match between ${sideName(match.homeCollegeId)} and ${sideName(match.awayCollegeId)}.`,
    location: `${match.venue ?? ""}${match.venueDetail ? " " + match.venueDetail : ""}`,
    dates: `${stamp(start)}/${stamp(end)}`,
  });
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&${params}`;
}
