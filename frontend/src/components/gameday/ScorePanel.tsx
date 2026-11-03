"use client";
// Scoring one game on game day (supervisors): both scores and a forfeit, or
// the result with an undo. The standings, team records and any bracket move
// with it on the server (services/scoring.ts).
import { useState } from "react";
import { toast } from "react-toastify";
import { scoreMatch, undoScore, type Match } from "@/lib/api/matches";
import { sideName } from "@/lib/format";

type Forfeit = "none" | "home" | "away" | "both";

const OUTCOME: Record<string, (home: string, away: string) => string> = {
  home: (home) => `${home} won`,
  away: (_, away) => `${away} won`,
  draw: () => "Draw",
  double_forfeit: () => "Both forfeited",
};

export default function ScorePanel({ match, onSaved }: { match: Match; onSaved: () => void }) {
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [forfeit, setForfeit] = useState<Forfeit>("none");
  const [saving, setSaving] = useState(false);
  const homeName = sideName(match.homeCollegeId);
  const awayName = sideName(match.awayCollegeId);

  const act = async (action: () => Promise<void>, done: string) => {
    setSaving(true);
    try {
      await action();
      toast.success(done);
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (match.result) {
    const r = match.result;
    return (
      <div className="rounded-xl border border-black/10 dark:border-white/10 p-5 text-center space-y-3">
        <div className="text-sm text-gray-500">Final{r.forfeit ? " (forfeit)" : ""}</div>
        <div className="text-3xl font-bold tabular-nums">
          {match.homeCollegeId} {r.homeScore ?? "–"} – {r.awayScore ?? "–"} {match.awayCollegeId}
        </div>
        <div className="text-sm font-semibold">{OUTCOME[r.outcome]?.(homeName, awayName)}</div>
        <button
          className="px-4 py-2 text-sm rounded-lg border border-red-300 text-red-700 dark:text-red-300 disabled:opacity-50"
          disabled={saving}
          onClick={() => {
            if (window.confirm("Undo this score? The points come off the standings.")) {
              act(() => undoScore(match.seasonId, match.id), "Score undone");
            }
          }}
        >
          Undo score
        </button>
      </div>
    );
  }
  if (match.status === "cancelled") {
    return <p className="text-sm text-gray-500 text-center py-6">This game is cancelled.</p>;
  }
  if (!match.homeCollegeId || !match.awayCollegeId) {
    return <p className="text-sm text-gray-500 text-center py-6">Waiting for both teams (an earlier round).</p>;
  }

  const digits = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (/^\d{0,3}$/.test(e.target.value)) set(e.target.value);
  };
  const forfeits = forfeit !== "none";
  const ready = forfeits || (home !== "" && away !== "");

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 p-5 space-y-5">
      <div className="flex items-center justify-center gap-3">
        <label className="flex flex-col items-center gap-1">
          <span className="text-sm font-semibold">{match.homeCollegeId}</span>
          <input
            inputMode="numeric"
            aria-label={`${homeName} score`}
            className="w-20 h-14 text-center text-2xl font-bold rounded-lg ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-black disabled:opacity-40"
            value={forfeits ? "" : home}
            disabled={forfeits}
            onChange={digits(setHome)}
          />
        </label>
        <span className="text-2xl text-gray-400 pt-6">–</span>
        <label className="flex flex-col items-center gap-1">
          <span className="text-sm font-semibold">{match.awayCollegeId}</span>
          <input
            inputMode="numeric"
            aria-label={`${awayName} score`}
            className="w-20 h-14 text-center text-2xl font-bold rounded-lg ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-black disabled:opacity-40"
            value={forfeits ? "" : away}
            disabled={forfeits}
            onChange={digits(setAway)}
          />
        </label>
      </div>

      <fieldset className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
        <legend className="sr-only">Forfeit</legend>
        <span className="text-gray-500">Forfeit:</span>
        {(
          [
            ["none", "None"],
            ["home", match.homeCollegeId],
            ["away", match.awayCollegeId],
            ["both", "Both"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="inline-flex items-center gap-1">
            <input type="radio" name="forfeit" checked={forfeit === value} onChange={() => setForfeit(value)} />
            {label}
          </label>
        ))}
      </fieldset>

      <button
        className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
        disabled={saving || !ready}
        onClick={() =>
          act(
            () =>
              scoreMatch(match.seasonId, match.id, {
                homeScore: forfeits ? 0 : Number(home),
                awayScore: forfeits ? 0 : Number(away),
                homeForfeit: forfeit === "home" || forfeit === "both",
                awayForfeit: forfeit === "away" || forfeit === "both",
              }),
            "Score saved"
          )
        }
      >
        {saving ? "Saving…" : "Save score"}
      </button>
    </div>
  );
}
