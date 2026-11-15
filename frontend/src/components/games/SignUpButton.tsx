"use client";
// Sign up for, or withdraw from, one upcoming game: the sign-up page's rows
// and the game page. Whoever is on the game may withdraw until the supervisor
// confirmed them (C21); nothing on a game that started or was cancelled
// (C23). The server checks the same rules; this only shows what applies.
import { useState } from "react";
import { toast } from "react-toastify";
import type { Match } from "@/lib/api/matches";
import { signUp, withdraw, type RosterEntry } from "@/lib/api/roster";
import { LEVELS, levelOf } from "@/lib/rosterLevels";

interface SignUpButtonProps {
  match: Match;
  /** The viewer's entry when they're on the game (null or undefined: not on it). */
  mine: Pick<RosterEntry, "captainStatus" | "present"> | null | undefined;
  /** After a sign-up (their new entry) or a withdrawal (null), so the list updates without a reload. */
  onChanged: (entry: RosterEntry | null) => void;
}

export default function SignUpButton({ match, mine, onChanged }: SignUpButtonProps) {
  const [busy, setBusy] = useState(false);
  if (match.status === "cancelled" || match.result || new Date(match.startsAt) <= new Date()) return null;

  const act = async (action: () => Promise<RosterEntry | null>, done: string) => {
    setBusy(true);
    try {
      onChanged(await action());
      toast.success(done);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const button = "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap disabled:opacity-60";

  if (mine?.present === true) {
    const { label, mark } = LEVELS.confirmed;
    return (
      <span title={label} className="px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
        Playing {mark}
      </span>
    );
  }
  if (mine) {
    const { mark } = LEVELS[levelOf(mine)];
    return (
      <span className="inline-flex items-center gap-2">
        {mark && <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{mark}</span>}
        <button
          type="button"
          disabled={busy}
          onClick={() => act(() => withdraw(match.seasonId, match.id).then(() => null), "You're off the game")}
          className={`${button} border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40`}
        >
          Withdraw
        </button>
      </span>
    );
  }
  return (
    <button type="button" disabled={busy} onClick={() => act(() => signUp(match.seasonId, match.id), "You're signed up")} className={`${button} bg-blue-600 text-white hover:bg-blue-700`}>
      Sign up
    </button>
  );
}
