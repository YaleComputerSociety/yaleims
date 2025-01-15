import { useEffect, useState } from "react";
import { useUser } from "@src/context/UserContext";
import MatchListItem from "./MatchListItem";
import { Match, CalendarMatchListProps } from "@src/types/components";
import { format, addDays, isSameDay } from "date-fns";

const ListView: React.FC<CalendarMatchListProps> = ({ matches }) => {
  const { user, signIn } = useUser();
  const [userMatches, setUserMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const getUserMatches = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `https://getusermatches-65477nrg6a-uc.a.run.app?userId=${user.email}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch user matches");
      }
      const data = await response.json();
      setUserMatches(data);
    } catch (error) {
      console.error("Error fetching user matches:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUserMatches();
  }, [user]);

  const getAllDates = () => {
    if (matches.length === 0) return [];

    const datesSet = new Set<string>();
    const startDate = new Date(matches[0].timestamp);
    const endDate = new Date(matches[matches.length - 1].timestamp);

    let currentDate = startDate;
    while (currentDate <= endDate) {
      datesSet.add(currentDate.toISOString());
      currentDate = addDays(currentDate, 1);
    }

    return Array.from(datesSet).map((isoDate) => new Date(isoDate));
  };

  const allDates = getAllDates();

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
          <div
            className="bg-green-500 dark:bg-green-600 shadow-md p-4 rounded-md 
                hover:shadow-lg hover:scale-105 hover:rounded-lg transition-transform duration-300 ease-in-out text-center"
            onClick={signIn}
          >
            <span className="text-white dark:text-gray-200 font-medium rounded-lg">
              Sign in with Google to sign up for matches!
            </span>
          </div>
        )}

        {allDates.map((date) => {
          const dateMatches = matches.filter((match: Match) =>
            isSameDay(new Date(match.timestamp), date)
          );

          if (dateMatches.length === 0) return null;

          return (
            <div
              key={format(date, "yyyy-MM-dd")}
              className="space-y-2 list-none"
            >
              <div className="ml-4 text-xl font-semibold text-black dark:text-white">
                {format(date, "EEEE, MMMM d, yyyy")}
              </div>
              {dateMatches.map((match: Match) => {
                const isSignedUp = userMatches.some(
                  (userMatch) =>
                    new Date(userMatch.timestamp).getTime() ===
                    new Date(match.timestamp).getTime()
                );
                return (
                  <MatchListItem
                    key={match.id}
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
