"use client";
// The quick way to set up a sport's playoffs or a tournament (supervisors):
// pick each half's colleges in seed order and when and where each round is
// played; the 15 slots (16 with a tournament's third place game) follow the
// league's usual layout. The full slot-by-slot editor and CSV upload stay
// below it for anything unusual.
//
// The layout (as the league's past brackets): in each half seed 1 has a bye
// to the quarterfinals, and the first round plays 5 v 4, 7 v 2 and 6 v 3;
// later rounds' sides fill in from results (server/services/brackets.ts).
import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useSeason } from "@/context/SeasonContext";
import { createBracket, DEFAULT_PLACEMENT_POINTS, type BracketSlotInput } from "@/lib/api/brackets";
import { COLLEGES, collegeName } from "@/lib/colleges";

type Kind = "playoffs" | "tournament";

/** First-round games of a half: [slot in the first half, home seed, away seed]; the second half's slots are 6 later. */
const FIRST_ROUND: [number, number, number][] = [
  [2, 5, 4],
  [3, 7, 2],
  [4, 6, 3],
];
const BYE_SLOT = [1, 7];

/** The rounds, with their slots (the byes go with the first round) and, by default, how many hours after the first round they start. */
const ROUNDS = [
  { key: "r1", label: "First round", slots: [1, 2, 3, 4, 7, 8, 9, 10], hoursAfter: 0 },
  { key: "qf", label: "Quarterfinals", slots: [5, 6, 11, 12], hoursAfter: 1 },
  { key: "sf", label: "Semifinals", slots: [13, 14], hoursAfter: 2 },
  { key: "f", label: "Final", slots: [15], hoursAfter: 3 },
  { key: "third", label: "Third place", slots: [16], hoursAfter: 3 },
] as const;
type RoundKey = (typeof ROUNDS)[number]["key"];

interface When {
  date: string;
  time: string;
  venue: string;
  venueDetail: string;
}
const NO_WHEN: When = { date: "", time: "", venue: "", venueDetail: "" };

const input =
  "w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100";

export default function BracketBuilder({ kind, onCreated }: { kind: Kind; onCreated?: () => void }) {
  const { currentSeason } = useSeason();
  const sports = currentSeason?.sports ?? [];
  const [name, setName] = useState("");
  const [sportId, setSportId] = useState("");
  const [points, setPoints] = useState(DEFAULT_PLACEMENT_POINTS);
  // Each half's colleges by seed (index 0 = seed 1); "" = not picked.
  const [halves, setHalves] = useState<string[][]>([Array(7).fill(""), Array(7).fill("")]);
  const [when, setWhen] = useState<Record<RoundKey, When>>({ r1: NO_WHEN, qf: NO_WHEN, sf: NO_WHEN, f: NO_WHEN, third: NO_WHEN });
  const [saving, setSaving] = useState(false);

  const rounds = ROUNDS.filter((r) => kind === "tournament" || r.key !== "third");
  const halfNames = kind === "playoffs" ? ["Blue division", "Green division"] : ["Top half", "Bottom half"];
  const picked = new Set(halves.flat().filter(Boolean));

  /** A round's when and where; anything left empty follows the first round (its time a set number of hours later). */
  const whenOf = (key: RoundKey): When => {
    const own = when[key];
    const first = when.r1;
    const later = (time: string, hours: number) => {
      if (!time) return "";
      const [h, m] = time.split(":").map(Number);
      return `${String(Math.min(23, h + hours)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };
    return {
      date: own.date || first.date,
      time: own.time || later(first.time, ROUNDS.find((r) => r.key === key)!.hoursAfter),
      venue: own.venue || first.venue,
      venueDetail: own.venueDetail || first.venueDetail,
    };
  };

  const slots = useMemo((): BracketSlotInput[] => {
    const division = (slot: number) =>
      kind === "tournament" ? null : slot === 15 ? ("final" as const) : slot <= 6 || slot === 13 ? ("blue" as const) : ("green" as const);
    const start = (w: When) => (w.date && w.time ? new Date(`${w.date}T${w.time}`).toISOString() : null);
    const base = (slot: number): BracketSlotInput => {
      const round = ROUNDS.find((r) => (r.slots as readonly number[]).includes(slot));
      const w = round ? whenOf(round.key) : NO_WHEN;
      return {
        slot,
        homeCollegeId: null,
        awayCollegeId: null,
        homeSeed: null,
        awaySeed: null,
        division: division(slot),
        startsAt: start(w),
        venue: w.venue || null,
        venueDetail: w.venueDetail || null,
      };
    };
    const out: BracketSlotInput[] = [];
    halves.forEach((seeds, h) => {
      const college = (seed: number) => seeds[seed - 1] || null;
      out.push({ ...base(BYE_SLOT[h]), homeCollegeId: college(1), homeSeed: 1 });
      for (const [slot, home, away] of FIRST_ROUND) {
        out.push({ ...base(slot + 6 * h), homeCollegeId: college(home), homeSeed: home, awayCollegeId: college(away), awaySeed: away });
      }
    });
    for (const slot of [5, 6, 11, 12, 13, 14, 15, ...(kind === "tournament" ? [16] : [])]) out.push(base(slot));
    return out.sort((a, b) => a.slot - b.slot);
    // whenOf reads `when`, listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [halves, when, kind]);

  const missing = [
    !sportId && "a sport",
    kind === "tournament" && !name.trim() && "a name",
    picked.size < 14 && `${14 - picked.size} more college${14 - picked.size === 1 ? "" : "s"}`,
    (!when.r1.date || !when.r1.time) && "the first round's date and time",
  ].filter(Boolean);

  const create = async () => {
    if (!currentSeason) return;
    setSaving(true);
    try {
      await createBracket(
        currentSeason.id,
        kind === "playoffs"
          ? { kind, sportId, slots }
          : { kind, sportId, name: name.trim(), slots, placementPoints: points }
      );
      toast.success(kind === "playoffs" ? "Playoffs created: the games are on the schedule." : "Tournament created: the games are on the schedule.");
      setHalves([Array(7).fill(""), Array(7).fill("")]);
      setName("");
      onCreated?.();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const setSeed = (h: number, i: number, college: string) =>
    setHalves((prev) => prev.map((seeds, k) => (k === h ? seeds.map((c, j) => (j === i ? college : c)) : seeds)));
  const setRound = (key: RoundKey, field: keyof When, value: string) =>
    setWhen((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-3">
        {kind === "tournament" && (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Name
            <input className={input} placeholder="One Day Volleyball Tournament" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Sport
          <select className={input} value={sportId} onChange={(e) => setSportId(e.target.value)}>
            <option value="" disabled>
              Select a sport
            </option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.emoji} {s.name}
              </option>
            ))}
          </select>
        </label>
        {kind === "tournament" && (
          <div className="sm:col-span-2 grid grid-cols-3 gap-2">
            {(["first", "second", "third"] as const).map((place) => (
              <label key={place} className="flex flex-col gap-1 text-xs font-medium">
                {place === "first" ? "1st" : place === "second" ? "2nd" : "3rd"} place points
                <input
                  type="number"
                  min={0}
                  className={input}
                  value={points[place]}
                  onChange={(e) => setPoints((p) => ({ ...p, [place]: Number(e.target.value) }))}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {halves.map((seeds, h) => (
          <div key={h} className="rounded-lg border border-black/10 dark:border-white/10 p-3 space-y-2">
            <h4 className="font-semibold text-sm">{halfNames[h]}</h4>
            {seeds.map((college, i) => (
              <label key={i} className="flex items-center gap-2 text-sm">
                <span className="w-14 shrink-0 text-gray-500">Seed {i + 1}</span>
                <select className={input} value={college} onChange={(e) => setSeed(h, i, e.target.value)}>
                  <option value="">—</option>
                  {COLLEGES.map((c) => (
                    <option key={c.id} value={c.id} disabled={picked.has(c.id) && c.id !== college}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <p className="text-xs text-gray-500">
              Seed 1 has a bye. First round: {FIRST_ROUND.map(([, home, away]) => `${home} v ${away}`).join(", ")}.
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-sm">When and where</h4>
        <p className="text-xs text-gray-500">Later rounds left empty follow the first round an hour apart, at the same place; edit single games later from Game Day.</p>
        <div className="space-y-2">
          {rounds.map((r) => (
            <div key={r.key} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-center">
              <span className="col-span-2 sm:col-span-1 text-sm font-medium">{r.label}</span>
              <input type="date" aria-label={`${r.label} date`} className={input} value={when[r.key].date} onChange={(e) => setRound(r.key, "date", e.target.value)} />
              <input type="time" aria-label={`${r.label} time`} title={r.key === "r1" ? undefined : `Default ${whenOf(r.key).time || "—"}`} className={input} value={when[r.key].time || (r.key === "r1" ? "" : whenOf(r.key).time)} onChange={(e) => setRound(r.key, "time", e.target.value)} />
              <input aria-label={`${r.label} venue`} placeholder={r.key === "r1" ? "Venue" : whenOf(r.key).venue || "Venue"} className={input} value={when[r.key].venue} onChange={(e) => setRound(r.key, "venue", e.target.value)} />
              <input aria-label={`${r.label} field`} placeholder={r.key === "r1" ? "Field / court" : whenOf(r.key).venueDetail || "Field / court"} className={input} value={when[r.key].venueDetail} onChange={(e) => setRound(r.key, "venueDetail", e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3 text-sm space-y-1">
        <div className="font-semibold">First round</div>
        {halves.map((seeds, h) => (
          <div key={h} className="text-gray-600 dark:text-gray-300">
            <span className="font-medium">{halfNames[h]}:</span> bye {collegeName(seeds[0]) ?? "seed 1"};{" "}
            {FIRST_ROUND.map(([, home, away]) => `${collegeName(seeds[home - 1]) ?? `seed ${home}`} v ${collegeName(seeds[away - 1]) ?? `seed ${away}`}`).join("; ")}
          </div>
        ))}
      </div>

      <button
        className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
        disabled={saving || missing.length > 0}
        onClick={create}
      >
        {saving ? "Creating…" : kind === "playoffs" ? "Create playoffs" : "Create tournament"}
      </button>
      {missing.length > 0 && <p className="text-xs text-gray-500 text-center">Still needed: {missing.join(", ")}.</p>}
    </div>
  );
}
