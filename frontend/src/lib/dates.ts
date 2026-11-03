// The league's calendar: days are Eastern-time days (D34), whatever time zone
// the code runs in (the server runs on UTC).
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

/** Midnight Eastern at the start of `day`, as an instant. */
export function easternMidnight(day: EasternDate): Date {
  const [y, m, d] = day.split("-").map(Number);
  // Midnight Eastern is 04:00 UTC in summer time (EDT), 05:00 in winter (EST).
  const edt = new Date(Date.UTC(y, m - 1, d, 4));
  return Number(easternHour.format(edt)) === 0 ? edt : new Date(Date.UTC(y, m - 1, d, 5));
}

const easternHour = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" });

/** The day `days` days after `day` (before, for a negative count). */
export function addDays(day: EasternDate, days: number): EasternDate {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
