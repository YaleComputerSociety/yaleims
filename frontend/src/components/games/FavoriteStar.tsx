"use client";
// A ★ that follows or unfollows a sport or a college (the Favorites tab):
// on the list's sport headers and on a game's page. It stops the click
// where it is, so a star inside a link doesn't follow the link.
import { useFavorites, type FavoriteKind } from "@/hooks/useFavorites";

export default function FavoriteStar({ kind, id, name }: { kind: FavoriteKind; id: string; name: string }) {
  const { has, toggle, busy, signedIn } = useFavorites();
  if (!signedIn) return null;
  const on = has(kind, id);
  const label = `${on ? "Unfollow" : "Follow"} ${name}`;
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      title={label}
      disabled={busy}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(kind, id);
      }}
      className={`px-1 text-base leading-none disabled:opacity-60 ${on ? "text-amber-500" : "text-gray-400 hover:text-amber-500"}`}
    >
      {on ? "★" : "☆"}
    </button>
  );
}
