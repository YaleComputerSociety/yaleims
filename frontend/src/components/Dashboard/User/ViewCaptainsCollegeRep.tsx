import { useEffect, useState } from "react";
import { useUser } from "@src/context/UserContext";

type Person = {
  email: string;
  firstname?: string;
  lastname?: string;
  firstName?: string;
  lastName?: string;
  sportsCaptainOf?: string[];
};

type ApiData = {
  captains: Person[];
  college_rep: Person[];
};

const displayName = (p: Person) =>
  `${p.firstname ?? p.firstName ?? ""} ${p.lastname ?? p.lastName ?? ""}`.trim() || p.email;

export default function ViewCaptainsCollegeRep() {
  const { user } = useUser();
  const [data, setData] = useState<ApiData | null>(null);
  const [view, setView] = useState<"captains" | "college_rep">("captains");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCaptains = async () => {
      try {
        const response = await fetch(
          `api/functions/getCaptainsCollegeRep?college=${user?.college}`
        );
        if (!response.ok) throw new Error("Error fetch captains");
        const json = await response.json();
        console.log(json)
        setData(json);
      } catch (e: any) {
        setError(e.message ?? "Failed to load");
      }
    };
    fetchCaptains();
  }, []); 

  const captainRows =
    data?.captains?.flatMap((c) =>
      (c.sportsCaptainOf ?? []).map((sport) => ({
        sport,
        name: displayName(c),
      }))
    ) ?? [];

  const repRows =
    data?.college_rep?.map((p) => ({
      name: displayName(p),
      email: p.email,
    })) ?? [];

  return (
    <div className="rounded-2xl border dark:border-white/10 dark:bg-white/5 bg-white/90 border-white/95 p-4 overflow-y-auto">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setView("captains")}
            className={`rounded-full px-3 py-1 text-sm transition
              ${view === "captains" ? "dark:bg-white/20 dark:text-white bg-black/5" : "dark:bg-white/10 dark:text-gray-200 hover:dark:bg-white/15 bg-black/5"}`}
          >
            Captains
          </button>
          <button
            onClick={() => setView("college_rep")}
            className={`rounded-full px-3 py-1 text-sm transition
              ${view === "college_rep" ? "dark:bg-white/20 dark:text-white bg-black/5" : "dark:bg-white/10 dark:text-gray-200 hover:dark:bg-white/15 bg-black/5"}`}
          >
            College Rep
          </button>
        </div>
      </div>

      {error && <div className="text-red-300 text-sm">{error}</div>}

      {!data ? (
        <div className="dark:text-gray-300 animate-pulse">Loading…</div>
      ) : view === "captains" ? (
        captainRows.length === 0 ? (
          <div className="dark:text-gray-300">No captains found.</div>
        ) : (
          <ul className="divide-y divide-white/10 rounded-xl dark:bg-white/5 p-2">
            {captainRows.map((r, i) => (
              <li key={`${r.sport}-${i}`} className="flex items-center justify-between py-2">
                <span className="dark:text-gray-200">{r.sport}</span>
                <span className="font-medium dark:text-white">{r.name}</span>
              </li>
            ))}
          </ul>
        )
      ) : 
      repRows.length === 0 ? (
        <div className="dark:text-gray-300">No college reps found.</div>
      ) : (
        <ul className="divide-y divide-white/10 rounded-xl dark:bg-white/5 p-2">
          {repRows.map((r, i) => (
            <li key={`${r.name}-${i}`} className="flex items-center justify-between py-2">
              <span className="font-medium dark:text-white">{r.name}</span>
              <a
                href={`mailto:${r.email}`}
                className="text-xs dark:text-gray-200 underline underline-offset-4"
              >
                {r.email}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
