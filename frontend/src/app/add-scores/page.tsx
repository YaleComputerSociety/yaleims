"use client";

import React, { useEffect, useState } from "react";
import { Matchv2 as Match } from "@src/types/components";
import MatchCard from "@src/components/AddScores/MatchCard";
import LoadingScreen from "@src/components/LoadingScreen";
import withProtectedRoute from "@src/components/withProtectedRoute";

// QUESTIONS / NEXT TODO:
// - change firestore rules, only admin can write to database of matches / colleges
//    - do we need to add check in the backend cloud function logic about auth?

// update later:
// - change collection to real colleges collection (not test collection)
// - should the winner of a double forfeit be "default"?
// - delete test matches

const AddScoresPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    document.title = "Score Matches";
  }, []);

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          "https://us-central1-yims-125a2.cloudfunctions.net/getUnscoredMatches"
        );

        if (response.ok) {
          const data = await response.json();
          setMatches(data.matches);
        }
      } catch (error) {
        console.error("Failed to fetch matches:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen p-8 flex-col items-center items-center mx-auto md:mx-20 ">
      {" "}
      <h1 className="md:text-4xl text-xl font-bold text-center mb-8 pt-8 text-blue-600">
        Matches To Be Scored
      </h1>
      <div className="flex flex-col gap-4 items-center">
        {Array.isArray(matches) && matches.length === 0 ? (
          <p>No past matches to be scored</p>
        ) : Array.isArray(matches) ? (
          matches.map((match) => (
            <MatchCard key={match.id} match={match} setLoading={setLoading} />
          ))
        ) : (
          <p>Something went wrong. Please try again later.</p>
        )}
      </div>
    </div>
  );
};

// withProtectedRoute handles auth check and redirects to home page if not logged in or not admin
export default withProtectedRoute(AddScoresPage);
