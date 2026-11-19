import { COLLEGES, collegeIdOfName } from "@/lib/colleges";
import type { Game } from "./types";

const easternDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "2026-11-18_basketball_JE_DC.pdf": the game's Eastern date, sport, then home and away colleges by abbreviation. */
export function scoresheetFileName(game: Game): string {
  const sport = game.sport.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const college = (name: string) => collegeIdOfName(COLLEGES, name) ?? "TBD";
  return `${easternDate.format(new Date(game.startsAt))}_${sport}_${college(game.home.name)}_${college(game.away.name)}.pdf`;
}
