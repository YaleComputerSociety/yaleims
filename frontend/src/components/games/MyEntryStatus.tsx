import type { MyMatch } from "@/lib/api/me";
import { LEVELS } from "@/lib/rosterLevels";

/**
 * Where the viewer's own sign-up for a game stands (D34, C14, C17): confirmed
 * by the supervisor (✓✓, whenever recorded: the one that counts); else,
 * before the game, pre-confirmed by their captain (✓). Nothing to say:
 * nothing shown.
 */
export default function MyEntryStatus({ mine, started }: { mine: MyMatch["mine"] | undefined; started: boolean }) {
  const level = !mine ? null : mine.present ? LEVELS.confirmed : !started && mine.captainStatus === "confirmed" ? LEVELS["pre-confirmed"] : null;
  if (!level) return null;
  const label = `${level.label[0].toUpperCase()}${level.label.slice(1)} ${level.mark}`;
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
