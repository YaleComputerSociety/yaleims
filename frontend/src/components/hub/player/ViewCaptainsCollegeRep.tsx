import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { paths } from "@/lib/paths";
import { useSeason } from "@/context/SeasonContext";
import { useUser } from "@/context/UserContext";
import { toCollegeAbbreviation } from "@/utils/helpers";
import type { PlayerDoc, SportDoc, TeamDoc } from "@/types/firestore";

type CaptainRow = { sport: string; name: string };
type RepRow = { name: string; email: string };

/** The user's college this season: its captains (from its teams) and its college reps, live. */
export default function ViewCaptainsCollegeRep() {
  const { user } = useUser();
  const seasonId = useSeason().currentSeason?.id;
  const collegeId = user ? toCollegeAbbreviation[user.college] : undefined;
  const [view, setView] = useState<"captains" | "college_rep">("captains");
  const [captainRows, setCaptainRows] = useState<CaptainRow[] | null>(null);
  const [repRows, setRepRows] = useState<RepRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!seasonId || !collegeId) return;
    const onError = (e: Error) => {
      console.error(e);
      setError(e.message ?? "Listener failed");
    };

    const reps = query(
      collection(db, paths.players(seasonId)),
      where("collegeId", "==", collegeId),
      where("roles", "array-contains", "college_rep")
    );
    const unsubReps = onSnapshot(reps, (snap) => {
      setRepRows(snap.docs.map((d) => ({ name: (d.data() as PlayerDoc).name, email: d.id })));
    }, onError);

    // Captains are on the college's teams; names from their player docs.
    const unsubTeams = onSnapshot(collection(db, paths.teams(seasonId, collegeId)), async (snap) => {
      const teams = snap.docs.map((d) => d.data() as TeamDoc);
      const captainIds = [...new Set(teams.flatMap((t) => t.captainIds))];
      const [sports, players] = await Promise.all([
        getDocs(collection(db, paths.sports(seasonId))),
        Promise.all(captainIds.map((id) => getDoc(doc(db, paths.player(seasonId, id))))),
      ]);
      const sportName = new Map(sports.docs.map((d) => [d.id, (d.data() as SportDoc).name]));
      const name = new Map(players.map((p) => [p.id, (p.data() as PlayerDoc | undefined)?.name ?? p.id]));
      setCaptainRows(
        teams.flatMap((t) =>
          t.captainIds.map((id) => ({ sport: sportName.get(t.sportId) ?? t.sportId, name: name.get(id)! }))
        )
      );
    }, onError);

    return () => {
      unsubReps();
      unsubTeams();
    };
  }, [seasonId, collegeId]);

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
              {captainRows.map((r, i) => (
                <li key={`${r.sport}-${i}`} className="flex items-center justify-between py-2">
                  <span className="text-gray-600 dark:text-gray-300">{r.sport}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{r.name}</span>
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
                <a
                  href={`mailto:${r.email}`}
                  className="text-xs text-gray-600 dark:text-gray-300 underline underline-offset-4 hover:text-black dark:hover:text-white transition"
                >
                  {r.email}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
