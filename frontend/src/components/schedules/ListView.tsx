import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useSession } from "@/context/SessionContext";
import MatchListItem from "./MatchListItem";
import { format, isSameDay, startOfDay, eachDayOfInterval } from "date-fns";
import { useSeason } from "@/context/SeasonContext";
import { useTournamentNames } from "@/hooks/useTournamentNames";
import type { Match } from "@/lib/api/matches";
import { fetchMyMatches, type MyMatch } from "@/lib/api/me";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signInUrl } from "@/lib/api/auth";
import type { RosterEntry } from "@/lib/api/roster";

interface ListViewProps {
  /** The current season's games, by start. */
  matches: Match[];
  topDate: Date;
  setTopDate: React.Dispatch<React.SetStateAction<Date>>;
}

// ⏰ Builds a scrollable list of matches grouped by calendar day.
//    Fixes the "missing last day" bug by normalising start & end to midnight.

const ListView: React.FC<ListViewProps> = ({ matches, topDate, setTopDate }) => {
  const { viewer } = useSession();
  const pathname = usePathname() || "/";
  // The games the user signed up for that haven't started, by id, with their entry's status.
  const [myEntries, setMyEntries] = useState<Map<string, MyMatch["mine"]>>(new Map());
  const [loading, setLoading] = useState(true);
  const dateRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { currentSeason } = useSeason();
  const sportOf = useMemo(() => new Map((currentSeason?.sports ?? []).map((s) => [s.id, s])), [currentSeason]);
  const tournamentOf = useTournamentNames(matches);

  const lastReportedDate = useRef<string | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!viewer || !currentSeason) {
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    fetchMyMatches({ seasonId: currentSeason.id, upcoming: true })
      .then(
        ({ items }) => live && setMyEntries(new Map(items.map((m) => [m.id, m.mine]))),
        (err) => console.error("Error fetching user matches:", err)
      )
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [viewer, currentSeason]);

  const allDates = useMemo<Date[]>(() => {
    if (!matches.length) return [];
    const start = startOfDay(new Date(matches[0].startsAt));
    const end = startOfDay(new Date(matches[matches.length - 1].startsAt));
    return eachDayOfInterval({ start, end });
  }, [matches]);

  const handleStatusChange = useCallback((matchId: string, entry: RosterEntry | null) => {
    setMyEntries((prev) => {
      const next = new Map(prev);
      if (entry) next.set(matchId, { captainStatus: entry.captainStatus, present: entry.present === true, underReview: false });
      else next.delete(matchId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!allDates.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const dateIso = entry.target.getAttribute("data-date");
          if (!dateIso || dateIso === lastReportedDate.current) return;

          lastReportedDate.current = dateIso;
          setTopDate(new Date(dateIso));
        });
      },
      { threshold: 0.1 }
    );

    observer.current = io;

    Object.values(dateRefs.current).forEach((ref) => ref && io.observe(ref));

    return () => io.disconnect();
  }, [allDates, setTopDate]);

  const setDateRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const dateIso = node.getAttribute("data-date");
    if (!dateIso) return;

    dateRefs.current[dateIso] = node;
    observer.current?.observe(node);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full mt-6 h-12 w-12 border-t-4 border-blue-500 border-solid" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!viewer && (
        <Link
          href={signInUrl(pathname)}
          prefetch={false}
          className="bg-green-500 dark:bg-green-600 shadow-md p-4 rounded-md hover:shadow-lg hover:scale-105 transition-transform duration-300 text-center"
        >
          <span className="text-white dark:text-gray-200 font-medium">
            Sign in with Cas to sign up for matches!
          </span>
        </Link>
      )}

      {allDates.map((date) => {
        const dayMatches = matches.filter((m) => isSameDay(new Date(m.startsAt), date));

        if (!dayMatches.length) return null;

        return (
          <div
            key={format(date, "yyyy-MM-dd")}
            data-date={date.toISOString()}
            ref={setDateRef}
            className="space-y-2 list-none"
          >
            <div className="text-xl font-semibold text-black dark:text-white">
              {format(date, "EEEE, MMMM d, yyyy")}
            </div>

            {dayMatches.map((match) => (
              <MatchListItem
                key={match.id}
                match={match}
                sport={sportOf.get(match.sportId)}
                tournament={tournamentOf(match)}
                viewer={viewer}
                onStatusChange={handleStatusChange}
                isSignedUp={myEntries.has(match.id)}
                mine={myEntries.get(match.id)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default ListView;
