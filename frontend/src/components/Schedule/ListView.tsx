import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useUser } from "@src/context/UserContext";
import MatchListItem from "./MatchListItem";
import { Match, CalendarMatchListProps } from "@src/types/components";
import { format, addDays, isSameDay } from "date-fns";
import { useSeason } from "@src/context/SeasonContext";
import Link from "next/link";
import { currentYear } from "@src/utils/helpers";

const ListView: React.FC<CalendarMatchListProps> = ({
  matches,
  topDate,
  setTopDate,
}) => {
  const { user } = useUser();
  const [userMatches, setUserMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const dateRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const { currentSeason } = useSeason();


  const lastReportedDateRef = useRef<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchMatches = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/functions/getUserMatches?seasonId=${currentSeason?.year || currentYear}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch user matches");
        }
        const data = await response.json();
        setUserMatches(data);
      } catch (e) {
        if ((e as any).name === "AbortError") return;
        console.error("Error fetching user matches:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [user, currentSeason?.year]);

  const uniqueMatches = useMemo<Match[]>(() => {
    const map = new Map<string, Match>();
    matches.forEach((m) => {
      map.set(m.id.toString(), m);
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [matches]);

  const allDates = useMemo(() => {
    if (uniqueMatches.length === 0) return [];

    const datesSet = new Set<string>();
    const startDate = new Date(uniqueMatches[0].timestamp);
    const endDate = new Date(
      uniqueMatches[uniqueMatches.length - 1].timestamp
    );

    let currentDate = startDate;
    while (currentDate <= endDate) {
      datesSet.add(currentDate.toISOString());
      currentDate = addDays(currentDate, 1);
    }

    return Array.from(datesSet).map((iso) => new Date(iso));
  }, [uniqueMatches]);

  const signedUpSet = useMemo(() => {
    return new Set(
      userMatches.map(
        (m) => `${m.id}::${new Date(m.timestamp).getTime()}`
      )
    );
  }, [userMatches]);

  useEffect(() => {
    if (allDates.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const date = entry.target.getAttribute("data-date");
          if (!date) return;
          if (lastReportedDateRef.current === date) return;
          lastReportedDateRef.current = date;
          setTopDate(new Date(date));
        });
      },
      { threshold: 0.1 }
    );
    observerRef.current = observer;

    Object.values(dateRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [allDates, setTopDate]);

  const setDateRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const date = node.getAttribute("data-date");
    if (date) {
      dateRefs.current[date] = node;
      if (observerRef.current) {
        observerRef.current.observe(node);
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full mt-6 h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {!user && (
          <Link
            className="bg-green-500 dark:bg-green-600 shadow-md p-4 rounded-md 
                hover:shadow-lg hover:scale-105 hover:rounded-lg transition-transform duration-300 ease-in-out text-center"
            href="/api/auth/login"
          >
            <span className="text-white dark:text-gray-200 font-medium rounded-lg">
              Sign in with Cas to sign up for matches!
            </span>
          </Link>
        )}

        {allDates.map((date) => {
          const dateMatches = uniqueMatches.filter((match: Match) =>
            isSameDay(new Date(match.timestamp), date)
          );

          if (dateMatches.length === 0) return null;

          return (
            <div
              key={format(date, "yyyy-MM-dd")}
              className="space-y-2 list-none"
              data-date={date.toISOString()}
              ref={setDateRef}
            >
              <div className="text-xl font-semibold text-black dark:text-white">
                {format(date, "EEEE, MMMM d, yyyy")}
              </div>
              {dateMatches.map((match: Match) => {
                const isSignedUp = signedUpSet.has(
                  `${match.id}::${new Date(match.timestamp).getTime()}`
                );
                return (
                  <MatchListItem
                    key={match.id.toString()}
                    match={match}
                    user={user}
                    isSignedUp={isSignedUp}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ListView;
