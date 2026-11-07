import { useCallback, useEffect, useMemo, useState } from "react";
import { useSeason } from "@/context/SeasonContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useSession } from "@/context/SessionContext";
import { fetchCollegePlayers, fetchMvps, nameMvp, type CollegePlayer, type Mvp } from "@/lib/api/colleges";

// ── MVP weeks: week 1 starts on the Monday of the season's first game ─────
// Weeks are counted in calendar days, not as 7 × 24 hours: the week of a
// daylight saving change is an hour longer or shorter.

/** The season's MVP week 1 (its mvpWeekOne, "yyyy-mm-dd") as a local midnight; null before the first game. */
function mvpWeekOne(day: string | null | undefined): Date | null {
  const [y, m, d] = (day ?? "").split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

/** The local midnight (a Monday) that starts week `n`. */
function weekStart(weekOne: Date, n: number): Date {
  return new Date(weekOne.getFullYear(), weekOne.getMonth(), weekOne.getDate() + 7 * (n - 1));
}

/** This week's number: the last week that has started (0 before week 1). */
function currentWeek(weekOne: Date): number {
  let n = 0;
  while (weekStart(weekOne, n + 1).getTime() <= Date.now()) n++;
  return n;
}

/** This week's option value ("week_4"). */
function currentWeekId(weekOne: Date): string {
  return `week_${currentWeek(weekOne)}`;
}

/** Every week from week 1 to this one, newest first, labelled with its dates (Monday to the next Monday). */
function weekOptions(weekOne: Date): { value: string; label: string }[] {
  const format = (d: Date) => d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  const options = [];
  for (let n = 1; n <= currentWeek(weekOne); n++) {
    options.push({ value: `week_${n}`, label: `Week ${n}: ${format(weekStart(weekOne, n))} – ${format(weekStart(weekOne, n + 1))}` });
  }
  return options.reverse();
}

/** The week number of a week option's value ("week_4" → 4). */
const weekNumber = (weekId: string) => Number(weekId.replace("week_", ""));

// ── The picker ─────────────────────────────────────────────────────────────

/** The rep's college: name one of its players an MVP of a week. */
export default function SelectMVP() {
  const [players, setPlayers] = useState<CollegePlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [settingMVP, setSettingMVP] = useState(false);
  const { currentSeason } = useSeason();
  const { viewer } = useSession();
  const collegeId = viewer?.collegeId ?? null;

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectUser, setSelectUser] = useState<CollegePlayer | null>(null);

  // UI-only states (validation/feedback)
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [weekId, setWeekId] = useState("");
  const [mvps, setMvps] = useState<Mvp[]>([]);

  const weekOne = mvpWeekOne(currentSeason?.mvpWeekOne);
  const weeks = weekOne ? weekOptions(weekOne) : [];
  // Start on the current week once the season (and its week 1) has loaded.
  useEffect(() => {
    const one = mvpWeekOne(currentSeason?.mvpWeekOne);
    if (one) setWeekId(currentWeekId(one));
  }, [currentSeason?.mvpWeekOne]);

  useEffect(() => {
    if (!currentSeason || !collegeId) return;
    let live = true;
    setLoading(true);
    fetchCollegePlayers(currentSeason.id, collegeId)
      .then(
        ({ items }) => live && setPlayers(items),
        (err) => {
          console.error(err);
          if (live) setError("Couldn’t load roster. Try again.");
        }
      )
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [currentSeason, collegeId]);

  const loadMvps = useCallback(async () => {
    if (!currentSeason || !collegeId) return;
    try {
      setMvps((await fetchMvps(currentSeason.id, collegeId)).items);
    } catch (err) {
      console.error(err);
      setMvps([]);
    }
  }, [currentSeason, collegeId]);

  useEffect(() => {
    loadMvps();
  }, [loadMvps]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return players.filter((p) => [p.name, p.netid ?? p.id].some((field) => field.toLowerCase().includes(term)));
  }, [searchTerm, players]);

  const weekMvps = mvps.filter((mvp) => mvp.week === weekNumber(weekId));

  if (loading || !currentSeason) return <div className="h-full w-full justify-center items-center flex"><LoadingSpinner /></div>

  const selectMvp = async () => {
    setError(null);
    setNotice(null);
    if (!selectUser) return setError("Pick a student first.");

    try {
      setSettingMVP(true);
      await nameMvp(currentSeason.id, collegeId!, weekNumber(weekId), selectUser.id);
      setNotice(`MVP set for ${weekId}.`);
      setSelectUser(null);
      setSearchTerm("");
      await loadMvps();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setSettingMVP(false);
    }
  };

  return (
    <div className="space-y-5 py-4">
      {/* Status banner */}
      <div className="rounded-lg p-4 shadow-sm bg-neutral-50 dark:bg-neutral-900 dark:shadow-black/30 text-sm space-y-2">
        <div className="flex items-center gap-2 pb-2">
          <select
            className="rounded-md border px-2 py-1 text-sm bg-white dark:bg-black"
            value={weekId}
            onChange={(e) => setWeekId(e.target.value)}
          >
            {weeks.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>

        {selectUser ? (
          <>Ready to set MVP for <strong>{selectUser.name || selectUser.id}</strong>.</>
        ) : (
          <>Pick a student to enable actions.</>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-md px-3 py-2 text-sm bg-red-50 text-red-700 dark:bg-red-950/30 shadow-sm dark:shadow-black/20" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-md px-3 py-2 text-sm bg-green-50 text-green-800 dark:bg-green-950/30 shadow-sm dark:shadow-black/20" role="status" aria-live="polite">
          {notice}
        </div>
      )}

      {/* Main panel */}
      <div className="rounded-xl p-4 shadow-md bg-white dark:bg-neutral-900 dark:shadow-black/40 space-y-4">
        {/* Existing MVPs for the chosen week */}
        {weekMvps.length > 0 && (
          <div className="rounded-md bg-blue-50 dark:bg-blue-950/40 p-3 text-sm">
            <p className="mb-2 font-semibold">Already selected for this week:</p>
            {weekMvps.map((mvp) => (
              <p key={mvp.id}>
                • {mvp.name} <span className="text-xs text-gray-500">({mvp.playerId})</span>
              </p>
            ))}
          </div>
        )}
        <button
          className="px-3 py-2 text-sm bg-green-600 text-white rounded-md shadow hover:opacity-90 disabled:opacity-50"
          disabled={settingMVP || !selectUser}
          onClick={selectMvp}
        >
          {settingMVP ? "Setting…" : "Select MVP"}
        </button>

        {/* Search */}
        <div className="relative w-full max-w-md">
          <input
            type="search"
            autoComplete="off"
            placeholder="Search by name or NetID…"
            className="w-full rounded-md px-3 py-2 text-sm bg-white dark:bg-black
                       ring-1 ring-black/10 focus:ring-2 focus:ring-black/20
                       dark:ring-white/10 dark:focus:ring-white/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md shadow-lg bg-white dark:bg-gray-900">
              {filteredUsers.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-500">No matches.</li>
              ) : (
                filteredUsers.slice(0, 10).map((u) => (
                  <li
                    key={u.id}
                    className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => {
                      setSelectUser(u);
                      setSearchTerm("");
                    }}
                  >
                    {u.name || u.id}{" "}
                    <span className="text-xs text-gray-500">({u.netid ?? u.id})</span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {/* Selected user */}
        {selectUser && (
          <div className="rounded-md px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 shadow-sm dark:shadow-black/20">
            Selected: <strong>{selectUser.name || selectUser.id}</strong>
          </div>
        )}

        {/* Helper text */}
        <p className="text-xs text-gray-500">
          {selectUser ? "Click Select MVP to confirm." : "Search and pick a student to continue."}
        </p>
      </div>
    </div>
  );
}
