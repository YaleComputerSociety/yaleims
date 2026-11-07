"use client";
// Scoring one game on game day (supervisors): both scores and a forfeit; once
// scored, the result with a correction and an undo. The standings, team
// records and any bracket move with it on the server (services/scoring.ts).
import { useState } from "react";
import { toast } from "react-toastify";
import { correctScore, scoreMatch, undoScore, type Match, type MatchCorrection } from "@/lib/api/matches";
import { sideName } from "@/lib/format";

type Forfeit = "none" | "home" | "away" | "both";

const OUTCOME: Record<string, (home: string, away: string) => string> = {
  home: (home) => `${home} won`,
  away: (_, away) => `${away} won`,
  draw: () => "Draw",
  double_forfeit: () => "Both forfeited",
};

export default function ScorePanel({ match, onSaved }: { match: Match; onSaved: () => void }) {
  const [mode, setMode] = useState<"view" | "correct" | "undo">("view");
  const [saving, setSaving] = useState(false);

  const act = async (action: () => Promise<void>, done: string) => {
    setSaving(true);
    try {
      await action();
      toast.success(done);
      setMode("view");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (match.result && mode === "correct") {
    return (
      <ScoreForm
        match={match}
        initial={match.result}
        saving={saving}
        submitLabel="Save correction"
        note={match.bracketId ? "The winner must stay the same. To change it, undo the score (later rounds first)." : null}
        onSubmit={(score) => act(() => correctScore(match.seasonId, match.id, score), "Score corrected")}
        onCancel={() => setMode("view")}
      />
    );
  }
  if (match.result) {
    const r = match.result;
    return (
      <div className="rounded-xl border border-black/10 dark:border-white/10 p-5 text-center space-y-3">
        <div className="text-sm text-gray-500">Final{r.forfeit ? " (forfeit)" : ""}</div>
        <div className="text-3xl font-bold tabular-nums">
          {match.homeCollegeId} {r.homeScore ?? "–"} – {r.awayScore ?? "–"} {match.awayCollegeId}
        </div>
        <div className="text-sm font-semibold">{OUTCOME[r.outcome]?.(sideName(match.homeCollegeId), sideName(match.awayCollegeId))}</div>
        {mode === "undo" ? (
          <div className="space-y-3 pt-2">
            <p className="text-sm">Undo this score? Its points come off the standings.</p>
            <div className="flex justify-center gap-2">
              <button
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                disabled={saving}
                onClick={() => act(() => undoScore(match.seasonId, match.id), "Score undone")}
              >
                {saving ? "Undoing…" : "Undo score"}
              </button>
              <button className="px-4 py-2 text-sm rounded-lg border border-black/15 dark:border-white/15" disabled={saving} onClick={() => setMode("view")}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center gap-2">
            <button className="px-4 py-2 text-sm rounded-lg border border-black/15 dark:border-white/15" onClick={() => setMode("correct")}>
              Correct score
            </button>
            <button className="px-4 py-2 text-sm rounded-lg border border-red-300 text-red-700 dark:text-red-300" onClick={() => setMode("undo")}>
              Undo score…
            </button>
          </div>
        )}
      </div>
    );
  }
  if (match.status === "cancelled") {
    return <p className="text-sm text-gray-500 text-center py-6">This game is cancelled.</p>;
  }
  if (!match.homeCollegeId || !match.awayCollegeId) {
    return <p className="text-sm text-gray-500 text-center py-6">Waiting for both teams (an earlier round).</p>;
  }
  return (
    <ScoreForm
      match={match}
      initial={null}
      saving={saving}
      submitLabel="Save score"
      note={null}
      onSubmit={(score) => act(() => scoreMatch(match.seasonId, match.id, score), "Score saved")}
    />
  );
}

/** Which side forfeited a stored result, for a correction's starting point. */
function forfeitOf(result: NonNullable<Match["result"]>): Forfeit {
  if (!result.forfeit) return "none";
  if (result.outcome === "double_forfeit") return "both";
  return result.outcome === "home" ? "away" : "home";
}

/** Both scores and a forfeit; a forfeiting side's score is 0. */
function ScoreForm({ match, initial, saving, submitLabel, note, onSubmit, onCancel }: {
  match: Match;
  initial: Match["result"];
  saving: boolean;
  submitLabel: string;
  note: string | null;
  onSubmit: (score: MatchCorrection) => void;
  onCancel?: () => void;
}) {
  const [home, setHome] = useState(initial?.homeScore?.toString() ?? "");
  const [away, setAway] = useState(initial?.awayScore?.toString() ?? "");
  const [forfeit, setForfeit] = useState<Forfeit>(initial ? forfeitOf(initial) : "none");
  const homeName = sideName(match.homeCollegeId);
  const awayName = sideName(match.awayCollegeId);

  const digits = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (/^\d{0,3}$/.test(e.target.value)) set(e.target.value);
  };
  const homeForfeit = forfeit === "home" || forfeit === "both";
  const awayForfeit = forfeit === "away" || forfeit === "both";
  const ready = (homeForfeit || home !== "") && (awayForfeit || away !== "");

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 p-5 space-y-5">
      <div className="flex items-center justify-center gap-3">
        <label className="flex flex-col items-center gap-1">
          <span className="text-sm font-semibold">{match.homeCollegeId}</span>
          <input
            inputMode="numeric"
            aria-label={`${homeName} score`}
            className="w-20 h-14 text-center text-2xl font-bold rounded-lg ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-black disabled:opacity-40"
            value={homeForfeit ? "0" : home}
            disabled={homeForfeit}
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
            value={awayForfeit ? "0" : away}
            disabled={awayForfeit}
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

      {note && <p className="text-xs text-gray-500 text-center">{note}</p>}
      <div className="flex gap-2">
        <button
          className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
          disabled={saving || !ready}
          onClick={() =>
            onSubmit({
              homeScore: homeForfeit ? 0 : Number(home),
              awayScore: awayForfeit ? 0 : Number(away),
              homeForfeit,
              awayForfeit,
            })
          }
        >
          {saving ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button className="px-4 rounded-lg border border-black/15 dark:border-white/15" disabled={saving} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
