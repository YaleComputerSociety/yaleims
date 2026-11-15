"use client";
// One sport at a time, as a row of chips: this term's sports first, a divider,
// then the others (lib/sports.ts). The games page and the sign-up page share it.
import type { Sport } from "@/lib/api/seasons";
import { isSportInTerm, sortSports } from "@/lib/sports";
import type { Term } from "@/types/firestore";

/** A pill-shaped toggle's classes, on or off (chips, the Today button, the Filters button). */
export const chipClass = (on: boolean) =>
  `px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
    on ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
  }`;

interface SportChipsProps {
  sports: Sport[];
  term: Term;
  /** The chosen sport's id; "" for all. */
  value: string;
  onChange: (sportId: string) => void;
}

export default function SportChips({ sports, term, value, onChange }: SportChipsProps) {
  const sorted = sortSports(sports);
  const thisTerm = sorted.filter((sport) => isSportInTerm(sport, term));
  const others = sorted.filter((sport) => !isSportInTerm(sport, term));
  const chip = (id: string, label: string) => (
    <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(value === id ? "" : id)} className={`flex-none ${chipClass(value === id)}`}>
      {label}
    </button>
  );
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Sport">
      {chip("", "All sports")}
      {thisTerm.map((sport) => chip(sport.id, `${sport.emoji} ${sport.name}`))}
      {others.length > 0 && <span className="flex-none w-px h-5 bg-gray-300 dark:bg-gray-700" aria-hidden />}
      {others.map((sport) => chip(sport.id, `${sport.emoji} ${sport.name}`))}
    </div>
  );
}
