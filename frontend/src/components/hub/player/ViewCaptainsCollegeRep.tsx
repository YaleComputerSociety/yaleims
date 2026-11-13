import { useEffect, useState } from "react";
import { useSeason } from "@/context/SeasonContext";
import { useSession } from "@/context/SessionContext";
import { fetchCollegeLeaders } from "@/lib/api/colleges";

type CaptainRow = { sport: string; names: string[] };
type RepRow = { name: string; email: string | null };

/** The user's college this season: its captains (by sport) and its college reps. */
export default function ViewCaptainsCollegeRep() {
  const { viewer } = useSession();
  const { currentSeason } = useSeason();
  const collegeId = viewer?.collegeId ?? null;
  const [view, setView] = useState<"captains" | "college_rep">("captains");
  const [captainRows, setCaptainRows] = useState<CaptainRow[] | null>(null);
  const [repRows, setRepRows] = useState<RepRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentSeason || !collegeId) return;
    let live = true;
    fetchCollegeLeaders(currentSeason.id, collegeId).then(
      ({ reps, captains }) => {
        if (!live) return;
        setRepRows(reps.map((rep) => ({ name: rep.name, email: rep.email })));
        // One row per sport (a sport may have several captains), in the season's sport order.
        setCaptainRows(
          currentSeason.sports
            .map((sport) => ({ sport: sport.name, names: captains.filter((c) => c.sportId === sport.id).map((c) => c.name) }))
            .filter((row) => row.names.length > 0)
        );
      },
      (e: Error) => {
        console.error(e);
        if (live) setError(e.message);
      }
    );
    return () => {
      live = false;
    };
  }, [currentSeason, collegeId]);

  return (
    <div className="overflow-y-auto">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setView("captains")}
            className={`rounded-lg p-2 md:px-3 md:py-1 text-xs md:text-sm transition
              ${view === "captains" ? "bg-red-500" : "bg-red-500/50 hover:bg-red-500/65"}`}
          >
            Captains
          </button>
          <button
            onClick={() => setView("college_rep")}
            className={`rounded-lg p-2 md:px-3 md:py-1 text-xs md:text-sm transition
              ${view === "college_rep" ? "bg-amber-500" : "bg-amber-500/50 hover:bg-amber-500/65"}`}
          >
            College Reps
          </button>
        </div>
      </div>

      {error && <div className="text-red-600 dark:text-red-300 text-xs md:text-sm">{error}</div>}
      <div className="overflow-y-auto max-h-32">
        {!captainRows || !repRows ? (
          <div className="text-gray-600 dark:text-gray-400 animate-pulse text-xs md:text-sm">Loading…</div>
        ) : view === "captains" ? (
          captainRows.length === 0 ? (
            <div className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">No captains found.</div>
          ) : (
            <ul className="divide-y divide-black/10 dark:divide-white/10 rounded-xl text-xs md:text-sm bg-black/[0.03] dark:bg-white/5 p-2">
              {captainRows.map((r) => (
                <li key={r.sport} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-gray-600 dark:text-gray-300">{r.sport}</span>
                  <span className="font-medium text-right text-gray-900 dark:text-white">{r.names.join(", ")}</span>
                </li>
              ))}
            </ul>
          )
        ) : 
        repRows.length === 0 ? (
          <div className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">No college rep found.</div>
        ) : (
          <ul className="divide-y divide-black/10 dark:divide-white/10 rounded-xl text-xs md:text-sm bg-black/[0.03] dark:bg-white/5 p-2">
            {repRows.map((r, i) => (
              <li key={`${r.name}-${i}`} className="flex items-center justify-between py-2">
                <span className="font-medium text-gray-900 dark:text-white">{r.name}</span>
                {r.email && (
                  <a
                    href={`mailto:${r.email}`}
                    className="text-xs text-gray-600 dark:text-gray-300 underline underline-offset-4 hover:text-black dark:hover:text-white transition"
                  >
                    {r.email}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
