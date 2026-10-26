import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useUser } from "@src/context/UserContext";
import MatchListItem from "./MatchListItem";
import type { MatchJson, UserSignupsResponse } from "@src/types/api";
import { CalendarMatchListProps, ScheduleMatch } from "@src/types/components";
import {
  format,
  addDays,
  isSameDay,
  startOfDay,
  eachDayOfInterval,
} from "date-fns";
import { useSeason } from "@src/context/SeasonContext";
import Link from "next/link";
import { currentYear, matchDate } from "@src/utils/helpers";

// ⏰ Builds a scrollable list of matches grouped by calendar day.
//    Fixes the "missing last day" bug by normalising start & end to midnight.

const ListView: React.FC<CalendarMatchListProps> = ({
  matches,
  topDate,
  setTopDate,
}) => {
  const { user } = useUser();
  // The user's signups ({ id, timestamp }); signing up adds the whole match.
  const [userMatches, setUserMatches] = useState<Pick<MatchJson, "id" | "timestamp">[]>([]);
  const [loading, setLoading] = useState(true);
  const dateRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { currentSeason } = useSeason();

  const lastReportedDate = useRef<string | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchMatches = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/functions/getUserMatches?seasonId=${
            currentSeason?.year || currentYear
          }`,
          { signal: controller.signal }
        );

        if (!res.ok) throw new Error("Failed to fetch user matches");
        const data: UserSignupsResponse = await res.json();
        setUserMatches(data);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== "AbortError") {
          console.error("Error fetching user matches:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
    return () => controller.abort();
  }, [user, currentSeason?.year]);

  const uniqueMatches = useMemo<ScheduleMatch[]>(() => {
    const byId = new Map<MatchJson["id"], ScheduleMatch>();

    matches.forEach((m) => {
      const dateVal = matchDate(m.timestamp);

      if (!isNaN(dateVal.getTime())) {
        byId.set(m.id, { ...m, timestamp: dateVal });
      }
    });

    return [...byId.values()].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [matches]);

  const allDates = useMemo<Date[]>(() => {
    if (!uniqueMatches.length) return [];

    const start = startOfDay(new Date(uniqueMatches[0].timestamp));
    const end = startOfDay(
      new Date(uniqueMatches[uniqueMatches.length - 1].timestamp)
    );

    return eachDayOfInterval({ start, end });
  }, [uniqueMatches]);

  const signedUpIds = useMemo(() => {
    return new Set(
      userMatches.map((m) => `${m.id}::${matchDate(m.timestamp).getTime()}`)
    );
  }, [userMatches]);

  const handleStatusChange = useCallback(
    (matchId: MatchJson["id"], signed: boolean) => {
      setUserMatches((prev) => {
        return signed
          ? [...prev, matches.find((m) => m.id === matchId)!]
          : prev.filter((m) => m.id !== matchId);
      });
    },
    [matches]
  );

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
      {!user && (
        <Link
          href="/api/auth/login"
          prefetch={false}
          className="bg-green-500 dark:bg-green-600 shadow-md p-4 rounded-md hover:shadow-lg hover:scale-105 transition-transform duration-300 text-center"
        >
          <span className="text-white dark:text-gray-200 font-medium">
            Sign in with Cas to sign up for matches!
          </span>
        </Link>
      )}

      {allDates.map((date) => {
        const dayMatches = uniqueMatches.filter((m) =>
          isSameDay(m.timestamp, date)
        );

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
                user={user}
                onStatusChange={handleStatusChange}
                isSignedUp={signedUpIds.has(
                  `${match.id}::${new Date(match.timestamp).getTime()}`
                )}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default ListView;
