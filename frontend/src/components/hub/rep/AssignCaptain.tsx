import { useSeason } from "@/context/SeasonContext";
import { useSession } from "@/context/SessionContext";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FaPlus, FaTimes } from "react-icons/fa";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import PersonName from "@/components/ui/PersonName";
import { assignCaptain, fetchCollegePlayers, removeCaptain, type CollegePlayer } from "@/lib/api/colleges";
import type { Sport } from "@/lib/api/seasons";
import { isSportInTerm } from "@/lib/sports";

/**
 * The rep's college: who captains each of the season's sports, this term's
 * first (and counted), then the others (C2, C16). A sport may have several
 * captains (any one of them pre-confirms players, D34) and a player may
 * captain several sports.
 */
export default function AssignCaptain() {
  const { currentSeason } = useSeason();
  const { viewer } = useSession();
  const collegeId = viewer?.collegeId ?? null;
  const [players, setPlayers] = useState<CollegePlayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // the sport being saved
  const [addingTo, setAddingTo] = useState<string | null>(null); // the sport whose search is open

  const load = useCallback(async () => {
    if (!currentSeason || !collegeId) return;
    try {
      setPlayers((await fetchCollegePlayers(currentSeason.id, collegeId)).items);
    } catch (err) {
      console.error(err);
      setError("Couldn’t load your college’s players. Try again.");
    }
  }, [currentSeason, collegeId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="py-6 text-center text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (viewer && !collegeId) {
    return (
      <p className="py-6 text-center text-sm text-gray-600 dark:text-gray-300">
        Your college isn&apos;t set this season, so there&apos;s no team to pick captains for. Ask an admin to set it.
      </p>
    );
  }
  if (!currentSeason || !collegeId || !players) return <div className="flex h-full w-full items-center justify-center"><LoadingSpinner /></div>;

  const thisTerm = currentSeason.sports.filter((sport) => isSportInTerm(sport, currentSeason.currentTerm));
  const others = currentSeason.sports.filter((sport) => !isSportInTerm(sport, currentSeason.currentTerm));
  const captainsOf = (sportId: string) => players.filter((p) => p.captainOf.includes(sportId));
  const covered = thisTerm.filter((sport) => captainsOf(sport.id).length > 0).length;

  /** Makes `player` captain of `sport`, or not, then reloads the players. */
  const change = async (sport: Sport, player: CollegePlayer, assign: boolean) => {
    setBusy(sport.id);
    try {
      await (assign ? assignCaptain : removeCaptain)(currentSeason.id, collegeId, sport.id, player.id);
      if (assign) setAddingTo(null);
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const list = (sports: Sport[]) => (
    <ul className="divide-y divide-black/5 rounded-xl bg-white shadow-md dark:divide-white/5 dark:bg-neutral-900 dark:shadow-black/40">
      {sports.map((sport) => (
        <SportRow
          key={sport.id}
          sport={sport}
          captains={captainsOf(sport.id)}
          players={players}
          busy={busy === sport.id}
          adding={addingTo === sport.id}
          setAdding={(open) => setAddingTo(open ? sport.id : null)}
          change={(player, assign) => change(sport, player, assign)}
        />
      ))}
    </ul>
  );

  return (
    <div className="space-y-4 py-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        <span className="font-semibold">{covered}</span> of {thisTerm.length} sports this term have a captain. A
        sport can have several captains; any one of them can pre-confirm players.
      </p>
      {list(thisTerm)}
      {others.length > 0 && (
        <>
          <h3 className="px-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Other sports this season</h3>
          {list(others)}
        </>
      )}
    </div>
  );
}

interface SportRowProps {
  sport: Sport;
  captains: CollegePlayer[];
  players: CollegePlayer[];
  busy: boolean;
  adding: boolean;
  setAdding: (open: boolean) => void;
  change: (player: CollegePlayer, assign: boolean) => Promise<void>;
}

/** One sport: its captains (each removable) and a search to add one. */
function SportRow({ sport, captains, players, busy, adding, setAdding, change }: SportRowProps) {
  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-auto font-medium">
          {sport.emoji} {sport.name}
        </span>
        {captains.length === 0 && <span className="text-xs text-gray-500">No captain</span>}
        {captains.map((captain) => (
          <span
            key={captain.id}
            className="inline-flex items-center gap-1 rounded-full bg-neutral-100 py-0.5 pl-2.5 pr-1 text-xs dark:bg-neutral-800"
          >
            <span>
              <PersonName person={captain} />
            </span>
            <button
              className="rounded-full p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
              aria-label={`Remove ${captain.name} as ${sport.name} captain`}
              disabled={busy}
              onClick={() => change(captain, false)}
            >
              <FaTimes className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        {!adding && (
          <button
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
            disabled={busy}
            onClick={() => setAdding(true)}
          >
            <FaPlus className="h-2.5 w-2.5" /> Add
          </button>
        )}
      </div>
      {adding && (
        <CaptainSearch
          sport={sport}
          candidates={players.filter((p) => !p.captainOf.includes(sport.id))}
          busy={busy}
          pick={(player) => change(player, true)}
          close={() => setAdding(false)}
        />
      )}
    </li>
  );
}

interface CaptainSearchProps {
  sport: Sport;
  candidates: CollegePlayer[];
  busy: boolean;
  pick: (player: CollegePlayer) => void;
  close: () => void;
}

/** Finds one of the college's players by name or NetID. */
function CaptainSearch({ sport, candidates, busy, pick, close }: CaptainSearchProps) {
  const [term, setTerm] = useState("");
  const query = term.trim().toLowerCase();
  const matches = query
    ? candidates.filter((p) => [p.name, p.netid ?? p.id].some((field) => field.toLowerCase().includes(query))).slice(0, 8)
    : [];

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <input
          type="search"
          autoFocus
          autoComplete="off"
          aria-label={`Add a ${sport.name} captain`}
          placeholder="Search your college by name or NetID…"
          className="w-full rounded-md bg-white px-3 py-2 text-sm ring-1 ring-black/10 focus:ring-2 focus:ring-black/20 dark:bg-black dark:ring-white/10 dark:focus:ring-white/20"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && close()}
        />
        <button className="text-xs text-gray-500 underline" onClick={close}>
          Cancel
        </button>
      </div>
      {query && (
        <ul className="overflow-hidden rounded-md bg-white shadow-lg dark:bg-gray-900">
          {matches.length === 0 && <li className="px-3 py-2 text-sm text-gray-500">No matches.</li>}
          {matches.map((player) => (
            <li key={player.id}>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
                disabled={busy}
                onClick={() => pick(player)}
              >
                <PersonName person={player} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
