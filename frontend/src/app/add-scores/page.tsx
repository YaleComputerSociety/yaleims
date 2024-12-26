"use client";

import React, { useEffect, useState } from "react";
import { Matchv2 as Match } from "@src/types/components";
import MatchCard from "@src/components/AddScores/MatchCard";
import LoadingScreen from "@src/components/LoadingScreen";

// TODO / PIECES:
// - frontend: styling, components
// - backend: write cloud functions
//     - addScores: add scores to firestore; updating match object and updating college stats -- points for affected colleges, and check ranks for all
//         - might be a good idea to have a separate cloud function for updating ranks, and call it from here; this depends on how we want to handle score inputting
//           if we want to still scrape stuff, then data will be added without going through my function, causing problems ??
//     - getUnscored: how? add a boolean field "scored"; or check if score is null (question is: what will an unscored match look like?)
// - routing/privacy: admin roles, only admins can access this page and change data
//      might require updating firestore rules to be safe, and also adding a role to the user object
//      update addUser cloud function to add role; with default "user", and "admin" for us (maybe IMs admin in future)

// NEXT TODO:
// - update ranks
// auth stuff
// ensure security

// start with:
// figure out how auth is working / how to restrict access to this page / update function for adding a user to include role

// update later:
// change getUnscored function to only get past matches (or today's matches)

const AddScoresPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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
      {/* may want to change the width of page? */}
      <h1 className="md:text-4xl text-xl font-bold text-center mb-8 pt-8 text-blue-600">
        Matches To Be Scored
      </h1>
      <div className="flex flex-col gap-4 items-center">
        {Array.isArray(matches) && matches.length === 0 ? (
          <p>No matches to be scored</p>
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

export default AddScoresPage;
