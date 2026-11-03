// The order sports are shown in, everywhere (filters, tabs, pickers): by
// term (fall, winter, spring), then by name. A season's sports come from the
// season (seasons/{s}/sports), never from a hard-coded list.
import type { SportDoc, Term } from "../types/firestore";

const TERM_ORDER: Term[] = ["fall", "winter", "spring"];

/** The sports in display order (a new array). */
export function sortSports<T extends Pick<SportDoc, "term" | "name">>(sports: T[]): T[] {
  return [...sports].sort(
    (a, b) => TERM_ORDER.indexOf(a.term) - TERM_ORDER.indexOf(b.term) || a.name.localeCompare(b.name)
  );
}
