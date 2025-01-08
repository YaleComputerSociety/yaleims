import { useEffect, useState } from "react";
import { useUser } from "@src/context/UserContext";
import MatchListItem from "../shared/matchListItem";
import { Match } from "@src/types/components";

interface CalendarMatchListProps {
  matches: Match[];
  signUp: (match: Match) => void;
  unregister: (match: Match) => void;
}

const ListView: React.FC<CalendarMatchListProps> = ({
  matches,
  signUp,
  unregister,
}) => {
  const { user, signIn } = useUser();
  const [signedUpMatches, setSignedUpMatches] = useState<Match[]>([]);
  const [signUpTriggered, setSignUpTriggered] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSignedUpMatches = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://us-central1-yims-125a2.cloudfunctions.net/getUserMatches?userId=${user.email}`
      );
      if (!response.ok) throw new Error("Failed to fetch signed-up matches");
      const data = await response.json();
      setSignedUpMatches(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToGCal = (match: Match) => {
    const link = generateGoogleCalendarLink(match);
    window.open(link, "_blank");
  };

  useEffect(() => {
    if (user) fetchSignedUpMatches();
  }, [user, signUpTriggered]);

  return (
    <div>
      {matches.length === 0 ? (
        <div className="text-center text-gray-500">
          No future matches found.
        </div>
      ) : (
        <ul className="space-y-4">
          {!user && (
            <li
              className="bg-green-500 dark:bg-green-600 shadow-md p-4 rounded-md 
                hover:shadow-lg hover:scale-110 transition-transform duration-300 ease-in-out text-center"
              onClick={signIn}
            >
              <span className="text-white dark:text-gray-200 font-medium">
                Sign in with Google to sign up for matches!
              </span>
            </li>
          )}
          {matches.map((match) => (
            <MatchListItem
              key={match.id}
              match={match}
              user={user}
              signedUpMatches={signedUpMatches}
              loading={loading}
              handleSignUp={(m) => {
                setLoading(true);
                signUp(m).finally(() => {
                  setSignUpTriggered((prev) => !prev);
                  setLoading(false);
                });
              }}
              handleUnregister={(m) => {
                setLoading(true);
                unregister(m).finally(() => {
                  setSignUpTriggered((prev) => !prev);
                  setLoading(false);
                });
              }}
              handleAddToGCal={handleAddToGCal}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default ListView;
