import { seasonSports } from "@src/utils/helpers";
import { useSeason } from "@src/context/SeasonContext";
import { useEffect, useMemo, useState } from "react";
import LoadingScreen from "@src/components/LoadingScreen";

interface User {
  email: string;
  firstName?: string; lastName?: string;
  firstname?: string; lastname?: string;
  captain?: string[];
}

interface Captain {
  email: string;
  sportsCaptainOf: string[];
}

export default function AssignCaptain() {
  const { currentSeason } = useSeason();
  const [usersInCollege, setUsersInCollege] = useState<User[]>([]);
  const [currentCaptains, setCurrentCaptains] = useState<Captain[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectSport, setSelectSport] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectUser, setSelectUser] = useState<User | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const nameOf = (u: User) =>
    `${u.firstName ?? u.firstname ?? ""} ${u.lastName ?? u.lastname ?? ""}`.trim();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/functions/getUsersInCollege?wantCaptains=true");
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      setUsersInCollege(Array.isArray(data?.users) ? data.users : []);
      setCurrentCaptains(Array.isArray(data?.captains) ? data.captains : []);
    } catch (err: any) {
      console.error(err);
      setError("Couldn’t load roster/captains. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return usersInCollege.filter((u) => {
      const full = nameOf(u).toLowerCase();
      return full.includes(term) || u.email.toLowerCase().includes(term);
    });
  }, [searchTerm, usersInCollege]);

  // captains grouped by sport
  const captainsBySport = useMemo(() => {
    const map: Record<string, Captain[]> = {};
    for (const c of currentCaptains) {
      for (const s of c.sportsCaptainOf ?? []) {
        (map[s] ||= []).push(c);
      }
    }
    return map;
  }, [currentCaptains]);

  const currentSports: string[] = currentSeason ? seasonSports[currentSeason.season] : [];
  const totalAssignments = useMemo(
    () => currentCaptains.reduce((sum, c) => sum + (c.sportsCaptainOf?.length ?? 0), 0),
    [currentCaptains]
  );

  const userIsCaptainForSelected =
    !!selectUser &&
    !!selectSport &&
    currentCaptains.some(
      (c) => c.email === selectUser.email && c.sportsCaptainOf?.includes(selectSport)
    );

  if (loading || !currentSeason) return <LoadingScreen />;

  const handleAction = async (assign: boolean) => {
    setNotice(null);
    setError(null);

    if (!selectUser) return setError("Pick a user first.");
    if (!selectSport) return setError("Pick a sport first.");
    if (assign && userIsCaptainForSelected) return setError("User is already captain for that sport.");
    if (!assign && !userIsCaptainForSelected) return setError("User isn’t captain for that sport.");

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/functions/assignRemoveCaptain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectUser.email,
          sport: selectSport,
          assign,
          remove: !assign,
        }),
      });
      const message = await response.json();
      console.log(message);
      setNotice(assign ? "Captain assigned." : "Captain removed.");
      setSelectUser(null);
      setSelectSport("");
    } catch (e) {
      console.log("error assigning/removing captain");
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
      await fetchData();
    }
  };

  return (
  <div className="space-y-5 py-4">
    {/* Status banner */}
    <div className="rounded-lg p-4 shadow-sm bg-neutral-50 dark:bg-neutral-900 dark:shadow-black/30">
      {currentCaptains.length === 0 ? (
        <div className="text-sm">
          <span className="font-semibold">No captains set</span> for {currentSeason.season} yet. Assign captains below.
        </div>
      ) : (
        <div className="text-sm">
          <span className="font-semibold">{currentCaptains.length}</span> unique captain
          {currentCaptains.length > 1 ? "s" : ""} set across{" "}
          <span className="font-semibold">{totalAssignments}</span> sport
          {totalAssignments !== 1 ? "s" : ""}.
        </div>
      )}
    </div>

    {/* Alerts */}
    {error && (
      <div
        className="rounded-md px-3 py-2 text-sm bg-red-50 text-red-700 dark:bg-red-950/30 shadow-sm dark:shadow-black/20"
        role="alert"
      >
        {error}
      </div>
    )}
    {notice && (
      <div
        className="rounded-md px-3 py-2 text-sm bg-green-50 text-green-800 dark:bg-green-950/30 shadow-sm dark:shadow-black/20"
        role="status"
        aria-live="polite"
      >
        {notice}
      </div>
    )}

    {/* Main content */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left panel: actions */}
      <div className="rounded-xl p-4 shadow-md bg-white dark:bg-neutral-900 dark:shadow-black/40 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="px-3 py-2 text-sm bg-green-600 text-white rounded-md shadow hover:opacity-90 disabled:opacity-50"
            disabled={isSubmitting || !selectUser || !selectSport || userIsCaptainForSelected}
            onClick={() => handleAction(true)}
          >
            Assign Captain
          </button>
          <button
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md shadow hover:opacity-90 disabled:opacity-50"
            disabled={isSubmitting || !selectUser || !selectSport || !userIsCaptainForSelected}
            onClick={() => handleAction(false)}
          >
            Remove Captain
          </button>

          <select
            name="sports"
            onChange={(e) => setSelectSport(e.target.value)}
            className="rounded-md px-3 py-2 text-sm bg-white dark:bg-black
                       ring-1 ring-black/10 focus:ring-2 focus:ring-black/20
                       dark:ring-white/10 dark:focus:ring-white/20"
            value={selectSport}
          >
            <option value="">— pick a sport —</option>
            {currentSports.map((s) => {
              const count = captainsBySport[s]?.length ?? 0;
              const label = count ? `${s} • ${count} captain${count > 1 ? "s" : ""}` : s;
              return (
                <option key={s} value={s}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full max-w-md">
          <input
            type="search"
            autoComplete="off"
            placeholder="Search by name or email…"
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
                    key={u.email}
                    className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => {
                      setSelectUser(u);
                      setSearchTerm("");
                    }}
                  >
                    {nameOf(u) || u.email}{" "}
                    <span className="text-xs text-gray-500">({u.email})</span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {/* Selected user */}
        {selectUser && (
          <div className="flex items-center gap-3">
            <div className="rounded-md px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 shadow-sm dark:shadow-black/20">
              Selected: <strong>{nameOf(selectUser) || selectUser.email}</strong>
            </div>
            <button
              type="button"
              className="text-xs underline text-gray-600"
              onClick={() => setSelectUser(null)}
            >
              Clear
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500">
          {selectUser && selectSport
            ? userIsCaptainForSelected
              ? "This user is already captain for this sport."
              : "Ready to assign."
            : "Pick a sport and a user to enable actions."}
        </p>
      </div>

      {/* Right panel: current captains */}
      <div className="rounded-xl p-4 shadow-md bg-white dark:bg-neutral-900 dark:shadow-black/40">
        <h3 className="font-semibold mb-3">Current Captains</h3>
        {Object.keys(captainsBySport).length === 0 ? (
          <p className="text-sm text-gray-500">No captains yet.</p>
        ) : (
          <ul className="space-y-2">
            {currentSports.map((sport) => (
              <li
                key={sport}
                className="rounded-md px-3 py-2 shadow-sm bg-white dark:bg-neutral-900 dark:shadow-black/30"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{sport}</span>
                  <div className="flex flex-wrap gap-2">
                    {(captainsBySport[sport] ?? []).map((c) => (
                      <span
                        key={`${sport}-${c.email}`}
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs
                                   bg-neutral-100 shadow-sm dark:bg-neutral-800 dark:shadow-black/20"
                        title={c.email}
                      >
                        {c.email}
                      </span>
                    ))}
                    {(captainsBySport[sport] ?? []).length === 0 && (
                      <span className="text-xs text-gray-500">No captain</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </div>
  )}
