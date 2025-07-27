"use client";

import React, { useState, useEffect } from "react";
import Bracket from "@src/components/Brackets/Bracket";
import { currentYear, sports } from "@src/utils/helpers";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { Ubuntu } from "next/font/google";
import { useSeason } from "@src/context/SeasonContext";
import LoadingSpinner from "@src/components/LoadingSpinner";
import LoadingScreen from "@src/components/LoadingScreen";

interface FirestoreMatch {
  bracket_placement: number;
  match_id: string;
  round: string;
}

const BracketsPage: React.FC = () => {
  const { currentSeason, pastSeasons, seasonLoading } = useSeason();
  const pastYears = pastSeasons?.years || [];

  const [sport, setSport] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [bracket, setBracket] = useState<FirestoreMatch[] | null>(null); // update type with a bracket type
  const [season, setSeason] = useState<string>(
    currentSeason?.year || currentYear
  );

  const handleSportChange = (sport: string) => {
    setSport(sport);
  };

  const handleSeasonChange = (season: string) => {
    setSeason(season);
  };

  useEffect(() => {
    const fetchBracket = async () => {
      try {
        setLoading(true);
        setError(null);

        const bracketDocRef = doc(db, "brackets", "seasons", season, sport);
        const bracketDoc = await getDoc(bracketDocRef);

        if (!bracketDoc.exists()) {
          setError(`Bracket for ${sport} (${season}) not found`);
          setBracket(null);
        } else {
          setBracket(bracketDoc.data().matches);
        }
      } catch (err) {
        console.error(`Error fetching bracket for ${sport} (${season}):`, err);
        setError(`Bracket doesn't yet exist!`);
      } finally {
        setLoading(false);
      }
    };

    if (sport && season) {
      fetchBracket();
    }
  }, [sport, season]);

  // TODO: fix loading and error displays

  // SMALL BUG: "Brackets" header slightly shifts when a new sport is selected?
  // may need to just redo the formatting of the header, may not be ideal

  if (seasonLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="p-6 min-h-screen">
      {/* header */}
      <div className="relative flex items-center w-full my-10">
        {/* sport dropdown left */}
        <div className="absolute left-0 flex gap-2">
          <select
            className="p-2 border border-gray-300 rounded"
            value={sport}
            onChange={(e) => handleSportChange(e.target.value)}
          >
            <option value="">Select Sport</option>
            {sports.map((sport) => (
              <option key={sport.name} value={sport.name}>
                {sport.emoji} {sport.name}
              </option>
            ))}
          </select>
        </div>

        {/* title */}
        <h1 className="text-2xl sm:text-4xl font-bold w-full text-center">
          Brackets
        </h1>

        {/* year dropdown right */}
        <div className="absolute right-0 flex gap-2">
          <select
            className="p-2 border border-gray-300 rounded"
            value={season}
            onChange={(e) => handleSeasonChange(e.target.value)}
          >
            <option value={currentSeason?.year || currentYear}>
              {currentSeason?.year || currentYear}
            </option>
            {pastYears
              .filter((y: string) => y !== (currentSeason?.year || currentYear))
              .map((y: string) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
          </select>
        </div>

        {/* loading and error states */}
        {loading && <LoadingSpinner />}
        {error && <p>no bracket yet!</p>}
      </div>
      {bracket ? <Bracket matches={bracket} /> : <p>No bracket</p>}
    </div>
  );
};

export default BracketsPage;
