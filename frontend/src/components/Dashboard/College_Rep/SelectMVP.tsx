import { useEffect, useMemo, useState } from "react";
import { useSeason } from "@src/context/SeasonContext";
import { seasonStart, getCurrentWeekId } from "@src/utils/helpers";
import LoadingSpinner from "@src/components/LoadingSpinner";

interface User {
  email: string;
  firstname?: string;  // handle both shapes
  lastname?: string;
  firstName?: string;
  lastName?: string;
  captain?: string[];
  college: string;
}

export default function SelectMVP() {
  const [usersInCollege, setUsersInCollege] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [settingMVP, setSettingMVP] = useState(false);
  const { currentSeason } = useSeason();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectUser, setSelectUser] = useState<User | null>(null);

  // UI-only states (validation/feedback)
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const nameOf = (u: User) =>
    `${u.firstName ?? u.firstname ?? ""} ${u.lastName ?? u.lastname ?? ""}`.trim();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/functions/getUsersInCollege?wantCaptains=false");
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      setUsersInCollege(Array.isArray(data?.users) ? data.users : []);
    } catch (err) {
      console.error(err);
      setError("Couldn’t load roster. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return usersInCollege.filter((u) => {
      const full = nameOf(u).toLowerCase();
      return full.includes(term) || u.email.toLowerCase().includes(term);
    });
  }, [searchTerm, usersInCollege]);

  if (loading || !currentSeason) return <div className="h-full w-full justify-center items-center flex"><LoadingSpinner /></div>

  const selectMvp = async () => {
    setError(null);
    setNotice(null);
    if (!selectUser) return setError("Pick a student first.");

    const weekId = getCurrentWeekId(seasonStart);

    try {
      setSettingMVP(true);
      await fetch("/api/functions/setMVP", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season: currentSeason.year,
          residentialCollege: selectUser.college,
          weekId: weekId,
          mvpEmail: selectUser.email,
        }),
      });
      setNotice(`MVP set for week ${weekId}.`);
      setSelectUser(null);
      setSearchTerm("");
    } catch (error) {
      console.log(error);
      setError("Something went wrong. Please try again.");
    } finally {
      setSettingMVP(false);
    }
  };

  const currentWeekId = getCurrentWeekId(seasonStart);

  return (
    <div className="space-y-5 py-4">
      {/* Status banner */}
      <div className="rounded-lg p-4 shadow-sm bg-neutral-50 dark:bg-neutral-900 dark:shadow-black/30 text-sm">
        <strong>{currentWeekId}</strong>.{" "}
        {selectUser ? (
          <>Ready to set MVP for <strong>{nameOf(selectUser) || selectUser.email}</strong>.</>
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
          <div className="rounded-md px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 shadow-sm dark:shadow-black/20">
            Selected: <strong>{nameOf(selectUser) || selectUser.email}</strong>
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
