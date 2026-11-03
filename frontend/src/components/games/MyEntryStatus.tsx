import type { MyMatch } from "@/lib/api/me";

/**
 * Where the viewer's own sign-up for a game stands (D34): before the game,
 * whether their captain confirmed them; after it, whether a supervisor
 * marked them present. Nothing to say: nothing shown.
 */
export default function MyEntryStatus({ mine, started }: { mine: MyMatch["mine"] | undefined; started: boolean }) {
  const label = !mine
    ? null
    : started
      ? mine.present
        ? "Attended ✓"
        : null
      : mine.captainStatus === "confirmed"
        ? "Captain confirmed ✓"
        : null;
  if (!label) return null;
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
      {label}
    </span>
  );
}

/** A cancelled game's badge. */
export function CancelledBadge() {
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
      Cancelled
    </span>
  );
}
