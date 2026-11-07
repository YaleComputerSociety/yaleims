// The order sports are shown in, everywhere (filters, tabs, pickers): by
// term (fall, winter, spring, miscellaneous), then by name. A season's sports
// come from the season (seasons/{s}/sports), never from a hard-coded list.
import type { SportDoc, Term } from "../types/firestore";

const TERM_ORDER: SportDoc["term"][] = ["fall", "winter", "spring", "miscellaneous"];

/** Miscellaneous sports remain available throughout the academic season. */
export function isSportInTerm(sport: Pick<SportDoc, "term">, term: Term): boolean {
  return sport.term === term || sport.term === "miscellaneous";
}

/** The sports in display order (a new array). */
export function sortSports<T extends Pick<SportDoc, "term" | "name">>(sports: T[]): T[] {
  return [...sports].sort(
    (a, b) => TERM_ORDER.indexOf(a.term) - TERM_ORDER.indexOf(b.term) || a.name.localeCompare(b.name)
  );
}
