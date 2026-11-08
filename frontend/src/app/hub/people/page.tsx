"use client";
// People (admins; account plan, step 9): find anyone by exact NetID, or list
// this season's players without a college and the accounts nobody has signed
// in to yet; open a person to see their season and correct their name,
// email, college and any game's attendance. Every change needs a reason (the
// audit log) and is refused when someone changed the same thing meanwhile
// (reload and retry). /hub/people?user=<id> opens a person directly (Reviews links here).
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import PageHeading from "@/components/layout/PageHeading";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import withRoleProtectedRoute from "@/components/hub/withRoleProtectedRoute";
import { useSeason } from "@/context/SeasonContext";
import {
  fetchPerson,
  findPeople,
  fixAttendance,
  fixCollege,
  fixProfile,
  type Person,
  type PersonGame,
  type PersonSummary,
} from "@/lib/api/people";
import { REVIEW_KINDS, REVIEW_STATUSES } from "@/lib/api/reviews";
import { COLLEGES, collegeName } from "@/lib/colleges";
import { NETID_PATTERN } from "@/lib/netid";

const box = "rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-gray-950 p-4 space-y-3";
const input = "rounded-md px-2 py-1 text-sm bg-white dark:bg-black ring-1 ring-black/10 dark:ring-white/10";
const button = "px-3 py-1 text-xs font-semibold rounded-full text-white bg-blue-600 disabled:opacity-50";
const date = (iso: string) => new Date(iso).toLocaleDateString([], { dateStyle: "medium" });

function PeoplePage() {
  const [results, setResults] = useState<PersonSummary[] | null>(null);
  const [netid, setNetid] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  // A link from Reviews opens its person.
  useEffect(() => setOpen(new URLSearchParams(window.location.search).get("user")), []);

  const search = async (query: Parameters<typeof findPeople>[0]) => {
    setResults(null);
    try {
      setResults((await findPeople(query)).items);
    } catch (err) {
      toast.error((err as Error).message);
      setResults([]);
    }
  };
  const typed = netid.trim().toLowerCase();

  return (
    <div className="min-h-screen pt-20 pb-12">
      <PageHeading heading="People" />
      <div className="max-w-3xl mx-auto px-4 space-y-4">
        <div className={box}>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (NETID_PATTERN.test(typed)) search({ netid: typed });
            }}
          >
            <input className={`${input} flex-1`} placeholder="Exact NetID" value={netid} onChange={(e) => setNetid(e.target.value)} />
            <button className={button} disabled={!NETID_PATTERN.test(typed)}>Find</button>
          </form>
          <div className="flex flex-wrap gap-2 text-sm">
            <button className="underline" onClick={() => search({ list: "unassigned" })}>Without a college this season</button>
            <button className="underline" onClick={() => search({ list: "unclaimed" })}>Not signed in yet</button>
            <Link href="/hub/reviews" className="underline">Review requests</Link>
          </div>
          {results?.length === 0 && <p className="text-sm text-gray-500">Nobody.</p>}
          {results && results.length > 1 && results.some((r) => r.netid && results.filter((o) => o.netid === r.netid).length > 1) && (
            <p className="text-sm text-red-600">
              More than one account has this NetID: sign-in and adds refuse it until the extra one is removed by hand.
            </p>
          )}
          <ul className="divide-y divide-black/5 dark:divide-white/5">
            {results?.map((p) => (
              <li key={p.userId} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {p.name} <span className="text-gray-500">({p.netid ?? p.userId})</span>
                  <span className="block text-xs text-gray-500">
                    {[p.claimed ? null : "not signed in yet", p.inSeason ? (collegeName(p.collegeId) ?? "college unassigned") : "not a player this season"]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <button className={button} onClick={() => setOpen(p.userId)}>Open</button>
              </li>
            ))}
          </ul>
        </div>
        {open && <PersonPanel key={open} userId={open} />}
      </div>
    </div>
  );
}

/** One person this season, with the corrections. */
function PersonPanel({ userId }: { userId: string }) {
  const { currentSeason } = useSeason();
  const seasonId = currentSeason?.id;
  const [person, setPerson] = useState<Person | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!seasonId) return;
    try {
      setPerson(await fetchPerson(userId, seasonId));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [userId, seasonId]);
  useEffect(() => {
    load();
  }, [load]);

  if (!person || !seasonId) return <div className="flex justify-center py-6"><LoadingSpinner /></div>;

  /** Runs one correction, then reloads (a 409 means someone else changed it: the reload shows what). */
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      toast.success("Saved.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      await load();
      setBusy(false);
    }
  };
  const why = reason.trim();

  return (
    <div className="space-y-4">
      <section className={box}>
        <h2 className="font-semibold">
          {person.name} <span className="font-normal text-gray-500">({person.netid ?? "no NetID recorded"})</span>
        </h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-gray-500">Name from</dt><dd>{person.nameSource}</dd>
          <dt className="text-gray-500">Email</dt><dd>{person.email ?? "none"}</dd>
          <dt className="text-gray-500">Username</dt><dd>{person.username}</dd>
          <dt className="text-gray-500">Account</dt>
          <dd>{person.claimed ? "signed in" : `made by ${person.createdBy ?? "?"}, not signed in yet`} · id {person.userId}</dd>
          <dt className="text-gray-500">Roles</dt>
          <dd>
            {[...person.roles, ...(person.season?.roles ?? []), ...(person.season?.captainOf ?? []).map((t) => `captain ${t.collegeId} ${t.sportId}`)].join(", ") || "none"}
          </dd>
        </dl>
        <label className="block text-sm">
          Reason for changes <span className="text-gray-500">(goes in the audit log)</span>
          <input className={`${input} w-full mt-1`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
        </label>
        <ProfileForm person={person} disabled={busy || !why} onSave={(fix) => run(() => fixProfile(userId, { ...fix, reason: why, revision: person.revision }))} />
      </section>

      <section className={box}>
        <h3 className="font-semibold">{seasonId}: college</h3>
        <p className="text-sm">
          {person.inSeason ? (collegeName(person.collegeId) ?? "Unassigned") : "Not a player this season"}
          {person.season?.collegeHistory.map((a, i) => (
            <span key={i} className="block text-xs text-gray-500">
              {date(a.since)}: {collegeName(a.collegeId) ?? "cleared"} ({a.source})
            </span>
          ))}
        </p>
        <CollegeForm
          current={person.collegeId}
          disabled={busy || !why}
          onSave={(collegeId) => run(() => fixCollege(userId, { seasonId, collegeId, reason: why, revision: person.season?.revision ?? null }))}
        />
        <p className="text-xs text-gray-500">
          Changing it ends their old college&apos;s captaincies and rep role and withdraws their upcoming sign-ups for its games.
        </p>
      </section>

      <section className={box}>
        <h3 className="font-semibold">{seasonId}: games</h3>
        {person.games.length === 0 && <p className="text-sm text-gray-500">None.</p>}
        <ul className="divide-y divide-black/5 dark:divide-white/5">
          {person.games.map((g) => (
            <GameRow
              key={g.matchId}
              game={g}
              sport={currentSeason?.sports.find((s) => s.id === g.sportId)?.name ?? g.sportId}
              disabled={busy}
              reason={why}
              onFix={(fix) => run(() => fixAttendance(userId, g.matchId, { ...fix, seasonId, revision: g.revision }))}
            />
          ))}
        </ul>
      </section>

      <section className={box}>
        <h3 className="font-semibold">Review requests</h3>
        {person.requests.length === 0 && <p className="text-sm text-gray-500">None.</p>}
        {person.requests.map((r) => (
          <p key={r.id} className="text-sm">
            {REVIEW_KINDS[r.kind]} · {REVIEW_STATUSES[r.status]} · {date(r.createdAt)}: {r.message}
            {r.resolution && <span className="block text-xs text-gray-500">Answer: {r.resolution}</span>}
          </p>
        ))}
        <Link href="/hub/reviews" className="text-sm underline">Answer them in Review requests</Link>
      </section>
    </div>
  );
}

function ProfileForm({ person, disabled, onSave }: { person: Person; disabled: boolean; onSave: (fix: { name?: string; email?: string | null }) => void }) {
  const [name, setName] = useState(person.name);
  const [email, setEmail] = useState(person.email ?? "");
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <input className={input} value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" maxLength={60} />
      <button className={button} disabled={disabled || !name.trim() || name === person.name} onClick={() => onSave({ name: name.trim() })}>
        Set name
      </button>
      <input className={input} value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" placeholder="netid@yale.edu" />
      <button className={button} disabled={disabled || email === (person.email ?? "")} onClick={() => onSave({ email: email.trim() || null })}>
        Set email
      </button>
    </div>
  );
}

function CollegeForm({ current, disabled, onSave }: { current: string | null; disabled: boolean; onSave: (collegeId: string | null) => void }) {
  const [choice, setChoice] = useState(current ?? "");
  return (
    <div className="flex gap-2 text-sm">
      <select className={input} value={choice} onChange={(e) => setChoice(e.target.value)} aria-label="College">
        <option value="">Unassigned</option>
        {COLLEGES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <button className={button} disabled={disabled || choice === (current ?? "")} onClick={() => onSave(choice || null)}>
        Set college
      </button>
    </div>
  );
}

type GameFix = { action: "confirm"; confirmed: boolean } | { action: "remove"; reason: string } | { action: "reassign"; netid: string; reason: string };

/** One game the person is recorded on, with its corrections. */
function GameRow({ game, sport, disabled, reason, onFix }: { game: PersonGame; sport: string; disabled: boolean; reason: string; onFix: (fix: GameFix) => void }) {
  const [netid, setNetid] = useState("");
  const typed = netid.trim().toLowerCase();
  const teams = game.homeCollegeId || game.awayCollegeId ? `${game.homeCollegeId ?? "TBD"} vs ${game.awayCollegeId ?? "TBD"}` : "game deleted";
  return (
    <li className="py-2 text-sm space-y-1">
      <div>
        {date(game.startsAt)} · {sport} · {teams} · on {game.collegeId}
        <span className="block text-xs text-gray-500">
          {[
            game.present === true ? "present" : game.present === false ? "not marked present" : "attendance never recorded",
            game.captainStatus === "removed" ? "taken off by the captain" : null,
            game.underReview ? "under review" : null,
            game.confirmedByAdmin ? "confirmed by an admin" : null,
          ].filter(Boolean).join(" · ")}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {(game.underReview || game.confirmedByAdmin) && (
          <button className={button} disabled={disabled} onClick={() => onFix({ action: "confirm", confirmed: !game.confirmedByAdmin })}>
            {game.confirmedByAdmin ? "Take back confirmation" : "Confirm attendance"}
          </button>
        )}
        <input className={input} placeholder="Right NetID" value={netid} onChange={(e) => setNetid(e.target.value)} aria-label="Right NetID" />
        <button className={button} disabled={disabled || !reason || !NETID_PATTERN.test(typed)} onClick={() => onFix({ action: "reassign", netid: typed, reason })}>
          Move to them
        </button>
        <button className={`${button} bg-red-600`} disabled={disabled || !reason} onClick={() => onFix({ action: "remove", reason })}>
          Remove
        </button>
      </div>
    </li>
  );
}

export default withRoleProtectedRoute(PeoplePage, (viewer) => viewer.can.managePeople);
