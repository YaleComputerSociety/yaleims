"use client";
// A game's roster sheet, for the sides the
// viewer manages: a captain confirms, removes and adds their college's
// players until the game starts; a supervisor ticks who came (one tap per
// player, any time) and adds walk-ins. Both add players by NetID too
// (U10). The server decides who
// manages which side (GET …/roster/sheet) and checks every change.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { FaCheck, FaTimes, FaUndo } from "react-icons/fa";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import PersonName from "@/components/ui/PersonName";
import { fetchCollegePlayers, type CollegePlayer } from "@/lib/api/colleges";
import type { Match } from "@/lib/api/matches";
import { lookUpNetid, type DirectoryEntry } from "@/lib/api/directory";
import {
  addByNetid,
  addRosterPlayer,
  changeRosterEntry,
  fetchRosterSheet,
  type RosterChange,
  type RosterSheet as Sheet,
} from "@/lib/api/roster";
import { collegeName } from "@/lib/colleges";
import { NETID_PATTERN, placeholderNetid } from "@/lib/netid";
import { useNow } from "@/lib/useNow";

type SheetEntry = Sheet["items"][number];

/**
 * What tells same-named players apart, shown in brackets after the name: the
 * account's NetID; a NetID no account has yet ("unverified"); or the id
 * (an email) of someone whose NetID isn't recorded yet (it is at their next visit).
 */
function who(player: { playerId: string; netid: string | null }): string {
  if (player.netid) return player.netid;
  const pending = placeholderNetid(player.playerId);
  return pending ? `${pending} · unverified` : player.playerId;
}

/** The small print on a sheet row about the person: not signed in yet (an account made for them), no college this season. */
function standing(entry: SheetEntry): string[] {
  return [...(entry.signedIn ? [] : ["not signed in yet"]), ...(entry.collegeAssigned ? [] : ["college unassigned"])];
}

/** How an entry got on the roster, for the row's small print; supervisors also see the captain's confirmation. */
function origin(entry: SheetEntry, supervisor: boolean): string {
  const how = entry.addedBy === "supervisor"
      ? "walk-in"
      : entry.addedBy === "captain"
        ? "added by captain"
        : "signed up";
  return supervisor && entry.captainStatus === "confirmed" ? `${how} · captain ✓` : how;
}

interface RosterSheetProps {
  match: Match;
  onChange?: (sheet: Sheet) => void;
}

export default function RosterSheet(props: RosterSheetProps) {
  const { match } = props;
  // New teams need a fresh sheet, including draft player additions. Key the
  // stateful component here so every caller drops the old team's state,
  // while ordinary time/place edits preserve it.
  const teams = `${match.seasonId}:${match.id}:${match.homeCollegeId}:${match.awayCollegeId}`;
  return <MatchRosterSheet key={teams} {...props} />;
}

function MatchRosterSheet({ match, onChange }: RosterSheetProps) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // the playerId (or action) being saved
  const now = useNow();
  const mounted = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const load = useCallback(async () => {
    try {
      const next = await fetchRosterSheet(match.seasonId, match.id);
      if (!mounted.current) return;
      setSheet(next);
      onChangeRef.current?.(next);
    } catch (err) {
      if (mounted.current) setError((err as Error).message);
    }
  }, [match.seasonId, match.id]);

  useEffect(() => {
    mounted.current = true;
    load();
    // A replaced team's outstanding request must not update state or report
    // its old sheet to a parent after this component has unmounted.
    return () => { mounted.current = false; };
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
              <div className="font-medium break-words">
                <PersonName person={entry} tag={who(entry)} />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {[origin(entry, supervisor), ...standing(entry)].join(" · ")}
              </div>
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
                <PersonName person={entry} tag={who(entry)} />
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
          <AddPlayer match={match} collegeId={collegeId} onRoster={entries} busy={busy} run={run} />
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
  busy: string | null;
  run: (key: string, action: () => Promise<unknown>) => Promise<void>;
}

/**
 * Adds a player to the side (U10): first one of the college's players this
 * season, found by name, NetID or email; otherwise a NetID looked up in the
 * Yale directory (their account is made for them), or, when the directory
 * doesn't know it or can't be reached, the NetID unverified, matched to the
 * person later.
 */
function AddPlayer({ match, collegeId, onRoster, busy, run }: AddPlayerProps) {
  const [open, setOpen] = useState(false);
  const [players, setPlayers] = useState<CollegePlayer[] | null>(null);
  const [term, setTerm] = useState("");
  const [lookup, setLookup] = useState<DirectoryEntry | "looking" | null>(null);
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!open || players) return;
    fetchCollegePlayers(match.seasonId, collegeId).then(
      ({ items }) => setPlayers(items),
      (err) => toast.error((err as Error).message)
    );
  }, [open, players, match.seasonId, collegeId]);

  const q = term.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!players || !q) return [];
    const taken = new Set(onRoster.filter((e) => e.captainStatus !== "removed").map((e) => e.playerId));
    return players
      .filter((p) => !taken.has(p.id) && [p.name, p.id, p.netid ?? ""].some((field) => field.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [players, q, onRoster]);
  const isNetid = NETID_PATTERN.test(q);

  if (!open) {
    return (
      <button className="text-sm font-semibold text-blue-600 dark:text-blue-400" onClick={() => setOpen(true)}>
        + Add player
      </button>
    );
  }
  const reset = () => {
    setTerm("");
    setLookup(null);
    setLabel("");
  };
  const add = (playerId: string) => run(playerId, () => addRosterPlayer(match.seasonId, match.id, playerId, { collegeId })).then(reset);
  const addNetid = () =>
    run(`netid-${q}`, async () => {
      const added = await addByNetid(match.seasonId, match.id, { netid: q, collegeId, name: label.trim() || null });
      if (!added.verified) toast.info(`${q} added unverified: it's matched to the person when they sign in.`);
    }).then(reset);
  const lookUp = async () => {
    setLookup("looking");
    try {
      setLookup(await lookUpNetid(q));
    } catch (err) {
      toast.error((err as Error).message);
      setLookup(null);
    }
  };
  const pill = "px-3 py-1 text-xs font-semibold rounded-full text-white disabled:opacity-50";

  return (
    <div className="space-y-2">
      <input
        autoFocus
        type="search"
        placeholder={`Name, NetID or email of a ${collegeName(collegeId)} player`}
        className="w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-black ring-1 ring-black/10 dark:ring-white/10 focus:ring-2 focus:ring-blue-400 outline-none"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setLookup(null);
        }}
      />
      {players === null && <LoadingSpinner />}
      {matches.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
          <span>
            <PersonName person={p} tag={who({ playerId: p.id, netid: p.netid })} />
          </span>
          <button className={`${pill} bg-blue-600`} disabled={busy !== null} onClick={() => add(p.id)}>
            Add
          </button>
        </div>
      ))}
      {players && q && matches.length === 0 && !isNetid && (
        <p className="text-xs text-gray-500">
          No {collegeName(collegeId)} player this season matches. Type their NetID to look them up in the Yale
          directory.
        </p>
      )}

      {isNetid && lookup === null && (
        <button className={`${pill} bg-gray-700 dark:bg-gray-600`} disabled={busy !== null} onClick={lookUp}>
          Look up {q} in the Yale directory
        </button>
      )}
      {lookup === "looking" && <LoadingSpinner />}
      {lookup && lookup !== "looking" && lookup.status === "found" && (
        <div className="flex items-center justify-between gap-2 text-sm rounded-lg bg-gray-50 dark:bg-gray-900 px-3 py-2">
          <span>
            {lookup.name} <span className="text-xs text-gray-500">({lookup.netid})</span>
            {lookup.collegeId && lookup.collegeId !== collegeId && (
              <span className="block text-xs text-red-600 dark:text-red-400">
                In {collegeName(lookup.collegeId)}, not {collegeName(collegeId)}.
              </span>
            )}
            {!lookup.collegeId && (
              <span className="block text-xs text-amber-700 dark:text-amber-300">
                College unassigned. This adds the player to this game only.
              </span>
            )}
          </span>
          <button
            className={`${pill} bg-blue-600`}
            disabled={busy !== null || (!!lookup.collegeId && lookup.collegeId !== collegeId)}
            onClick={addNetid}
          >
            Add
          </button>
        </div>
      )}
      {lookup && lookup !== "looking" && lookup.status !== "found" && (
        <div className="space-y-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm">
          <p className="text-amber-900 dark:text-amber-200">
            {lookup.status === "not-found"
              ? `The Yale directory has no ${lookup.netid}. Check the NetID, or add it unverified:`
              : "The Yale directory isn't answering right now. You can add the NetID unverified:"}{" "}
            it&apos;s matched to the person when they sign in.
          </p>
          <input
            placeholder="Their name (optional)"
            className="w-full rounded-md px-2 py-1 text-sm bg-white dark:bg-black ring-1 ring-black/10 dark:ring-white/10"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <button className={`${pill} bg-amber-600`} disabled={busy !== null} onClick={addNetid}>
            Add {lookup.netid} unverified
          </button>
        </div>
      )}
      <div>
        <button
          className="text-xs text-gray-500"
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
