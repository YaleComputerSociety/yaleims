import { useEffect, useState } from "react";
import { useUser } from "@src/context/UserContext";
import MatchListItem from "../shared/matchListItem";
import { Match, CalendarMatchListProps } from "@src/types/components";
import { format, addDays, isSameDay } from "date-fns";

const ListView: React.FC<CalendarMatchListProps> = ({ matches }) => {
  const { user, signIn } = useUser();
  const [userMatches, setUserMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const getUserMatches = async () => {
    if (!user) return;

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
      console.log(data);
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
      {matches.length === 0 ? (
        <div className="text-center text-gray-500">
          No future matches found.
        </div>
      ) : (
        <div className="space-y-4">
          {!user && (
            <div
              className="bg-green-500 dark:bg-green-600 shadow-md p-4 rounded-md 
                hover:shadow-lg hover:scale-110 transition-transform duration-300 ease-in-out text-center"
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

            return (
              <div
                key={`date-${date.toISOString()}`}
                className="space-y-2 list-none"
              >
                {/* Date Heading */}
                <div
                  className={`ml-4 text-xl font-semibold ${
                    dateMatches.length === 0
                      ? "text-gray-400 text-xs"
                      : "text-black dark:text-white"
                  }`}
                >
                  {format(date, "EEEE, MMMM d, yyyy")}
                </div>

                {/* Matches for the Date */}
                {dateMatches.length > 0
                  ? dateMatches.map((match: Match) => {
                      console.log(userMatches, match.timestamp);
                      const isSignedUp = userMatches.some((userMatch) => {
                        console.log(userMatch.timestamp, match.timestamp);
                        return (
                          new Date(userMatch.timestamp).getTime() ===
                          new Date(match.timestamp).getTime()
                        );
                      });

                      return (
                        <MatchListItem
                          key={match.id}
                          match={match}
                          user={user}
                          isSignedUp={isSignedUp}
                        />
                      );
                    })
                  : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ListView;
