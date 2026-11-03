"use client";
// A game's roster sheet (D34, U5-ROSTER-WORKFLOW.md), for the sides the
// viewer manages: a captain confirms, removes and adds their college's
// players until the game starts; a supervisor ticks who came (one tap per
// player, any time), adds walk-ins and guests. The server decides who
// manages which side (GET …/roster/sheet) and checks every change.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { FaCheck, FaTimes, FaUndo } from "react-icons/fa";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { fetchCollegePlayers, type CollegePlayer } from "@/lib/api/colleges";
import type { Match } from "@/lib/api/matches";
import {
  addGuest,
  addRosterPlayer,
  changeRosterEntry,
  fetchRosterSheet,
  type RosterChange,
  type RosterSheet as Sheet,
} from "@/lib/api/roster";
import { collegeName } from "@/lib/colleges";
import { useNow } from "@/lib/useNow";

type SheetEntry = Sheet["items"][number];

/**
 * What tells same-named players apart, shown in brackets after the name: the
 * NetID, "guest" for a guest, or the email of someone whose NetID isn't
 * recorded yet (it is at their next visit).
 */
function who(player: { playerId: string; netid: string | null }): string {
  return player.playerId.startsWith("guest-") ? "guest" : (player.netid ?? player.playerId);
}

/** How an entry got on the roster, for the row's small print; supervisors also see the captain's confirmation. */
function origin(entry: SheetEntry, supervisor: boolean): string {
  const how = entry.playerId.startsWith("guest-")
    ? "added by supervisor"
    : entry.addedBy === "supervisor"
      ? "walk-in"
      : entry.addedBy === "captain"
        ? "added by captain"
        : "signed up";
  return supervisor && entry.captainStatus === "confirmed" ? `${how} · captain ✓` : how;
}

export default function RosterSheet({ match, onChange }: { match: Match; onChange?: (sheet: Sheet) => void }) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // the playerId (or action) being saved
  const now = useNow();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const load = useCallback(async () => {
    try {
      const next = await fetchRosterSheet(match.seasonId, match.id);
      setSheet(next);
      onChangeRef.current?.(next);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [match.seasonId, match.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400 py-6 text-center">{error}</p>;
  if (!sheet) return <div className="flex justify-center py-10"><LoadingSpinner /></div>;

  const started = new Date(match.startsAt).getTime() <= now;
  const locked = !sheet.supervisor && started;

  /** Runs one change (or several), then reloads the sheet. */
  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await action();
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const change = (entry: SheetEntry, c: RosterChange) =>
    run(entry.playerId, () => changeRosterEntry(match.seasonId, match.id, entry.playerId, c));

  return (
    <div className="space-y-6">
      {locked && (
        <p className="rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm px-3 py-2">
          The game has started: the supervisor takes attendance from here.
        </p>
      )}
      {sheet.collegeIds.map((collegeId) => (
        <Side
          key={collegeId}
          match={match}
          collegeId={collegeId}
          entries={sheet.items.filter((e) => e.collegeId === collegeId)}
          supervisor={sheet.supervisor}
          locked={locked}
          busy={busy}
          change={change}
          run={run}
        />
      ))}
    </div>
  );
}

interface SideProps {
  match: Match;
  collegeId: string;
  entries: SheetEntry[];
  supervisor: boolean;
  locked: boolean;
  busy: string | null;
  change: (entry: SheetEntry, c: RosterChange) => Promise<void>;
  run: (key: string, action: () => Promise<unknown>) => Promise<void>;
}

/** One college's side of the sheet. */
function Side({ match, collegeId, entries, supervisor, locked, busy, change, run }: SideProps) {
  const playing = entries.filter((e) => e.captainStatus !== "removed");
  const removed = entries.filter((e) => e.captainStatus === "removed");
  const present = playing.filter((e) => e.present).length;
  const confirmed = playing.filter((e) => e.captainStatus === "confirmed");

  const bulk = supervisor
    ? { label: "Mark all captain-confirmed present", todo: confirmed.filter((e) => !e.present), c: { present: true } }
    : { label: "Confirm everyone", todo: playing.filter((e) => e.captainStatus !== "confirmed"), c: { captainStatus: "confirmed" as const } };

  return (
    <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-gray-950 overflow-hidden">
      <header className="flex items-baseline justify-between gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-900">
        <h3 className="font-semibold">
          {collegeId} · {collegeName(collegeId)}
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {supervisor ? `${present} present · ` : ""}
          {playing.length} on roster · {confirmed.length} confirmed
        </span>
      </header>

      <ul className="divide-y divide-black/5 dark:divide-white/5">
        {playing.length === 0 && <li className="px-4 py-3 text-sm text-gray-500">Nobody yet.</li>}
        {playing.map((entry) => (
          <li key={entry.playerId} className="flex items-center gap-3 px-4 py-2.5">
            {supervisor && (
              <input
                type="checkbox"
                aria-label={`${entry.name} present`}
                className="h-5 w-5 accent-emerald-600"
                checked={!!entry.present}
                disabled={busy !== null}
                onChange={() => change(entry, { present: !entry.present })}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">
                {entry.name} <span className="font-normal text-gray-500 dark:text-gray-400">({who(entry)})</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{origin(entry, supervisor)}</div>
            </div>
            {!locked && !supervisor && entry.captainStatus !== "confirmed" && (
              <button
                className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-600 text-white disabled:opacity-50"
                disabled={busy !== null}
                onClick={() => change(entry, { captainStatus: "confirmed" })}
              >
                Confirm
              </button>
            )}
            {!locked && !supervisor && entry.captainStatus === "confirmed" && (
              <button
                className="text-xs text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1"
                title="Take back the confirmation"
                disabled={busy !== null}
                onClick={() => change(entry, { captainStatus: null })}
              >
                <FaCheck /> confirmed
              </button>
            )}
            {!locked && (
              <button
                className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50"
                aria-label={`Remove ${entry.name}`}
                title="Take off this game"
                disabled={busy !== null}
                onClick={() => change(entry, { captainStatus: "removed" })}
              >
                <FaTimes />
              </button>
            )}
          </li>
        ))}
      </ul>

      {removed.length > 0 && (
        <div className="px-4 pb-2">
          <div className="text-xs uppercase tracking-wide text-gray-400 pt-3 pb-1">Taken off</div>
          {removed.map((entry) => (
            <div key={entry.playerId} className="flex items-center justify-between py-1.5 text-sm text-gray-500">
              <span className="line-through">
                {entry.name} ({who(entry)})
              </span>
              {!locked && (
                <button
                  className="text-xs inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={() => change(entry, { captainStatus: null })}
                >
                  <FaUndo /> Put back
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!locked && (
        <div className="px-4 py-3 space-y-3 border-t border-black/5 dark:border-white/5">
          <AddPlayer match={match} collegeId={collegeId} onRoster={entries} supervisor={supervisor} busy={busy} run={run} />
          {bulk.todo.length > 0 && (
            <button
              className="w-full py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white disabled:opacity-50"
              disabled={busy !== null}
              onClick={() =>
                run(`bulk-${collegeId}`, () =>
                  Promise.all(bulk.todo.map((e) => changeRosterEntry(match.seasonId, match.id, e.playerId, bulk.c)))
                )
              }
            >
              {bulk.label} ({bulk.todo.length})
            </button>
          )}
        </div>
      )}
    </section>
  );
}

interface AddPlayerProps {
  match: Match;
  collegeId: string;
  onRoster: SheetEntry[];
  supervisor: boolean;
  busy: string | null;
  run: (key: string, action: () => Promise<unknown>) => Promise<void>;
}

/** Adds one of the college's season players by name or email; supervisors can add a guest. */
function AddPlayer({ match, collegeId, onRoster, supervisor, busy, run }: AddPlayerProps) {
  const [open, setOpen] = useState(false);
  const [players, setPlayers] = useState<CollegePlayer[] | null>(null);
  const [term, setTerm] = useState("");

  useEffect(() => {
    if (!open || players) return;
    fetchCollegePlayers(match.seasonId, collegeId).then(
      ({ items }) => setPlayers(items),
      (err) => toast.error((err as Error).message)
    );
  }, [open, players, match.seasonId, collegeId]);

  const matches = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!players || !q) return [];
    const taken = new Set(onRoster.filter((e) => e.captainStatus !== "removed").map((e) => e.playerId));
    return players
      .filter(
        (p) =>
          !taken.has(p.id) &&
          [p.name, p.id, p.netid ?? ""].some((field) => field.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [players, term, onRoster]);

  if (!open) {
    return (
      <button className="text-sm font-semibold text-blue-600 dark:text-blue-400" onClick={() => setOpen(true)}>
        + Add player
      </button>
    );
  }
  const add = (playerId: string) =>
    run(playerId, () => addRosterPlayer(match.seasonId, match.id, playerId)).then(() => setTerm(""));
  const guest = () =>
    run("guest", () => addGuest(match.seasonId, match.id, { name: term.trim(), collegeId })).then(() => setTerm(""));

  return (
    <div className="space-y-2">
      <input
        autoFocus
        type="search"
        placeholder={`Name, NetID or email of a ${collegeName(collegeId)} player`}
        className="w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-black ring-1 ring-black/10 dark:ring-white/10 focus:ring-2 focus:ring-blue-400 outline-none"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      {players === null && <LoadingSpinner />}
      {matches.map((p) => (
        <div key={p.id} className="flex items-center justify-between text-sm">
          <span>
            {p.name} <span className="text-xs text-gray-500">({who({ playerId: p.id, netid: p.netid })})</span>
          </span>
          <button
            className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-600 text-white disabled:opacity-50"
            disabled={busy !== null}
            onClick={() => add(p.id)}
          >
            Add
          </button>
        </div>
      ))}
      {players && term.trim() && matches.length === 0 && (
        <p className="text-xs text-gray-500">No {collegeName(collegeId)} player this season matches.</p>
      )}
      {supervisor && term.trim().length > 1 && (
        <button
          className="text-xs text-gray-600 dark:text-gray-300 underline disabled:opacity-50"
          disabled={busy !== null}
          onClick={guest}
        >
          Not found? Add “{term.trim()}” as a guest
        </button>
      )}
      <div>
        <button className="text-xs text-gray-500" onClick={() => setOpen(false)}>
          Done
        </button>
      </div>
    </div>
  );
}
