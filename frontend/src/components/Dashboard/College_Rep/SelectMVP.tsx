import { useEffect, useMemo, useState } from "react";
import { useSeason } from "@src/context/SeasonContext";
import LoadingSpinner from "@src/components/LoadingSpinner";
import { seasonStart, getCurrentWeekId, buildWeekOptions } from "@src/utils/helpers";
import { useUser } from "@src/context/UserContext";

interface User {
  email: string;
  firstname?: string;  // handle both shapes
  lastname?: string;
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

  const [weekId, setWeekId] = useState(getCurrentWeekId(seasonStart));
  const [mvps, setMvps]  = useState<Record<string, any> | null>(null);
  const { user } = useUser();

  const weeks = buildWeekOptions(seasonStart);

  const nameOf = (u: User) =>
    `${u.firstname ?? ""} ${u.lastname ?? ""}`.trim();

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
    if (!currentSeason) return;

    const fetchMvps = async () => {
      try {
        const res = await fetch(
          `/api/functions/getMVPs?seasonId=${currentSeason.year}&collegeId=${user?.college}`,
        );
        if (!res.ok) throw new Error(res.statusText);
        setMvps(await res.json());
      } catch (err) {
        console.error(err);
        setMvps(null);
      }
    };

    fetchMvps();
  }, [selectUser?.college, weekId]);


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
          mvpFName: selectUser.firstname,
          mvpLName: selectUser.lastname
        }),
      });
      setNotice(`MVP set for ${weekId}.`);
      setSelectUser(null);
      setSearchTerm("");
    } catch (error) {
      console.log(error);
      setError("Something went wrong. Please try again.");
    } finally {
      setSettingMVP(false);
    }
  };

  console.log(weeks)
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
        {/* Existing MVPs for the chosen week */}
        {mvps && mvps[weekId] && (
          <div className="rounded-md bg-blue-50 dark:bg-blue-950/40 p-3 text-sm">
            <p className="mb-2 font-semibold">Already selected for this week:</p>
            {Object.entries(mvps[weekId]).map(([email, p]: any) => (
              <p key={email}>
                • {p.fname} {p.lname} <span className="text-xs text-gray-500">({email})</span>
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
