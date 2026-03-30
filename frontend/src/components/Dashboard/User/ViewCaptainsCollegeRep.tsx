import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
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
    if (!user?.college) return; 
    try {
      const q = query(
        collection(db, "users"),
        where("college", "==", user.college),
        where("mRoles", "array-contains-any", ["captain", "college_rep"])
      );

      const unsub = onSnapshot(q, snap => {
        const captains: Person[]   = [];
        const reps: Person[]       = [];

        snap.forEach(d => {
          const u = d.data() as any;
          const person: Person = {
            email: u.email ?? d.id,
            firstName: u.firstname ?? u.firstName ?? "",
            lastName: u.lastname ?? u.lastName ?? "",
            sportsCaptainOf: u.sportsCaptainOf ?? [],
          };

          if (u.mRoles?.includes("captain"))      captains.push(person);
          if (u.mRoles?.includes("college_rep")) reps.push({ ...person, sportsCaptainOf: [] });
        });

        setData({ captains, college_rep: reps });
      });

      return () => unsub(); 
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Listener failed");
    }
  }, [user?.college]);

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

      {error && <div className="text-red-300 text-xs md:text-sm">{error}</div>}
      <div className="overflow-y-auto max-h-32">
        {!data ? (
          <div className="text-gray-400 animate-pulse text-xs md:text-sm">Loading…</div>
        ) : view === "captains" ? (
          captainRows.length === 0 ? (
            <div className="text-gray-400 text-xs md:text-sm">No captains found.</div>
          ) : (
            <ul className="divide-y divide-white/10 rounded-xl text-xs md:text-sm bg-white/5 p-2">
              {captainRows.map((r, i) => (
                <li key={`${r.sport}-${i}`} className="flex items-center justify-between py-2">
                  <span className="text-gray-300">{r.sport}</span>
                  <span className="font-medium text-white">{r.name}</span>
                </li>
              ))}
            </ul>
          )
        ) : 
        repRows.length === 0 ? (
          <div className="text-gray-400 text-xs md:text-sm">No college rep found.</div>
        ) : (
          <ul className="divide-y divide-white/10 rounded-xl text-xs md:text-sm bg-white/5 p-2">
            {repRows.map((r, i) => (
              <li key={`${r.name}-${i}`} className="flex items-center justify-between py-2">
                <span className="font-medium text-white">{r.name}</span>
                <a
                  href={`mailto:${r.email}`}
                  className="text-xs text-gray-300 underline underline-offset-4 hover:text-white transition"
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
