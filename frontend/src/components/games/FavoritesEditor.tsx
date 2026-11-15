"use client";
// The favorites, editable in one place (G20): every sport of the season and
// every college as a chip with its ★, in the games page's Favorites tab.
import { useFavorites, type FavoriteKind } from "@/hooks/useFavorites";
import type { Sport } from "@/lib/api/seasons";
import { COLLEGES } from "@/lib/colleges";
import { sortSports } from "@/lib/sports";
import { chipClass } from "./SportChips";

export default function FavoritesEditor({ sports }: { sports: Sport[] }) {
  const { has, toggle, busy } = useFavorites();
  const chip = (kind: FavoriteKind, id: string, label: string) => {
    const on = has(kind, id);
    return (
      <button key={`${kind}:${id}`} type="button" aria-pressed={on} disabled={busy} onClick={() => toggle(kind, id)} className={chipClass(on)}>
        {on ? "★" : "☆"} {label}
      </button>
    );
  };
  const group = (title: string, chips: React.ReactNode) => (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</h3>
      <div className="flex flex-wrap gap-2">{chips}</div>
    </div>
  );
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3 space-y-3">
      {group("Sports", sortSports(sports).map((sport) => chip("sport", sport.id, `${sport.emoji} ${sport.name}`)))}
      {group("Colleges", COLLEGES.map((college) => chip("college", college.id, college.name)))}
    </div>
  );
}
