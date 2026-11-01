// The league's calendar: days are Eastern-time days (D34), whatever time zone
// the code runs in (the server runs on UTC). No dependencies, so the
// migration (database/migrate) uses it too.
import type { EasternDate } from "../types/firestore";

const easternDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The Eastern-time day of `date`, "yyyy-mm-dd". */
export function easternDate(date: Date): EasternDate {
  return easternDay.format(date);
}

/**
 * When a season starts: July 1 of its start year, midnight Eastern (EDT,
 * UTC-4). "Joined this season" counts from here (D30).
 */
export function seasonStart(startYear: number): Date {
  return new Date(Date.UTC(startYear, 6, 1, 4));
}

/** The Monday of the week `day` falls in (weeks run Monday to Sunday). */
export function mondayOf(day: EasternDate): EasternDate {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(d - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}
