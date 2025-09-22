"use client";

import React, { useState, useEffect } from "react";
import { currentYear, sports } from "@src/utils/helpers";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useRef } from "react";
// import  TeamData from "@src/components/Brackets/BracketCell";
import BracketCell from "@src/components/Brackets/BracketCell";
// import { Match } from "@src/types/components";
import { Ubuntu } from "next/font/google";
import { useSeason } from "@src/context/SeasonContext";
import LoadingScreen from "@src/components/LoadingScreen";
import withProtectedRoute from "@src/components/withProtectedRoute";
import withRoleProtectedRoute from "@src/components/withRoleProtectedRoute";
import PageHeading from "@src/components/PageHeading";

// const ubuntu = Ubuntu({
//   subsets: ["latin"],
//   weight: ["400", "700"],
// });

interface FirestoreMatch {
  bracket_placement: number;
  match_id: string;
  round: string;
}

// mapping index in bracket array to the type of location of the match in the bracket
const leftPlayoffIndices = [0, 1, 2, 3];
const leftQuarterIndices = [4, 5];
const leftSemiIndex = 12;
const rightPlayoffIndices = [6, 7, 8, 9];
const rightQuarterIndices = [10, 11];
const rightSemiIndex = 13;
const finalIndex = 14;

const BracketsPage: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
  }, []);

  const { currentSeason, pastSeasons, seasonLoading } = useSeason();
  const pastYears = pastSeasons?.years || [];

  const [sport, setSport] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [bracket, setBracket] = useState<FirestoreMatch[] | null>(null);
  const [season, setSeason] = useState<string>(
    currentSeason?.year || currentYear
  );

  const handleSeasonChange = (season: string) => {
    setSeason(season);
  };

  const handleSportChange = (sport: string) => {
    setSport(sport);
  };

  // TODO Kaitlyn: move this into a function and api route for security
  useEffect(() => {
    if (!sport || !season) {
      setBracket(null);
      return;
    }

    const fetchBracket = async () => {
      try {
        setLoading(true);
        setError(null);

        const bracketDocRef = doc(db, "brackets", "seasons", season, sport);
        const bracketDoc = await getDoc(bracketDocRef);

        if (!bracketDoc.exists() || !bracketDoc.data()?.matches) {
          setError(`Bracket for ${sport} (${season}) not found`);
          setBracket(null);
        } else {
          const matches = bracketDoc.data()?.matches as FirestoreMatch[];
          matches.sort((a, b) => a.bracket_placement - b.bracket_placement);
          setBracket(matches);
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

  if (seasonLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className={`min-h-screen bg-blue-100 py-10`}>
      <PageHeading heading="Brackets" />

      {/* Welcome Message */}
      <div className="max-w-3xl mx-auto my-10 bg-white rounded-lg shadow px-6 py-4 text-center text-lg text-gray-700 mb-4">
        <p className="font-bold mb-2">Welcome to the Brackets Page!</p>
        <p>
          To view upcoming, past, or current playoff matches, please select your
          desired sport and year.
        </p>
      </div>

      {/* Sport Selector & Actions */}
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow px-6 py-4 flex flex-wrap justify-between items-center text-gray-700 mb-28 gap-4">
        <div className="flex justify-between w-full">
          {/* Sport on left */}
          <div className="flex items-center gap-4">
            <span className="text-lg font-semibold">Sport:</span>
            <select
              className="border border-gray-300 rounded px-3 py-1"
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

          {/* Year on right */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">Year:</span>
            <select
              className="border border-gray-300 rounded px-3 py-1"
              value={season}
              onChange={(e) => handleSeasonChange(e.target.value)}
            >
              <option value={currentSeason?.year || currentYear}>
                {currentSeason?.year || currentYear}
              </option>
              {pastYears
                .filter(
                  (y: string) => y !== (currentSeason?.year || currentYear)
                )
                .map((y: string) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/*Dynamic Bracket Title */}
      {sport && season && (
        <div className="text-center mt-2 mb-10 pb-4">
          <h2 className="text-3xl font-bold text-gray-800">
            {sports.find((s) => s.name === sport)?.emoji} {sport} {season}
          </h2>
        </div>
      )}

      <div className="pl-[320px] pr-6">
        <div className="w-full overflow-x-auto">
          <div className="w-max"></div>
        </div>
      </div>

      {/* Column Titles Row */}
      <div className="relative z-0">
        <div className="absolute inset-0 bg-[url('/bracket-overlay.png')] bg-cover bg-center opacity-45 z-0 pointer-events-none mt-12 backdrop-blur-3xl"></div>

        {/* Bracket Columns */}
        {bracket ? (
          <div className="w-full overflow-x-auto">
            <div className="flex w-fit pl-[350px]">
              <div className=" grid grid-cols-7 gap-60 items-start">
                <div className="flex flex-col items-center">
                  <span className="mb-4 bg-blue-300 text-blue-900 text-m font-semibold px-4 py-1 rounded-full shadow-sm">
                    Playoffs
                  </span>

                  {/* Left Playoffs */}
                  <div className="flex flex-col items-end space-y-20">
                    {leftPlayoffIndices.map((index) => {
                      const match = bracket[index];
                      return (
                        <div
                          className="scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                          key={match.match_id}
                        >
                          <BracketCell
                            matchId={match.match_id}
                            season={season}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Left Quarters */}
                <div className="flex flex-col items-center">
                  <span className="mb-4 bg-blue-300 text-blue-900 text-m font-semibold px-4 py-1 rounded-full shadow-sm">
                    Quarterfinals
                  </span>
                  <div className="ml-4 flex flex-col items-end justify-center space-y-36">
                    {leftQuarterIndices.map((index) => {
                      const match = bracket[index];
                      return (
                        <div
                          className="scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                          key={match.match_id}
                        >
                          <BracketCell
                            matchId={match.match_id}
                            season={season}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Left Semis */}
                <div className="flex flex-col items-center">
                  <span className="mb-4 bg-blue-300 text-blue-900 text-m font-semibold px-4 py-1 rounded-full shadow-sm">
                    Semifinals
                  </span>
                  <div className="ml-6 flex flex-col items-end justify-center space-y-48">
                    <div
                      className="scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                      key={bracket[leftSemiIndex].match_id}
                    >
                      <BracketCell
                        matchId={bracket[leftSemiIndex].match_id}
                        season={season}
                      />
                    </div>
                  </div>
                </div>

                {/* Final */}
                <div className="flex flex-col items-center">
                  <span className="mb-4 bg-blue-300 text-blue-900 text-m font-semibold px-4 py-1 rounded-full shadow-sm">
                    Finals
                  </span>
                  <div className="flex flex-col items-center justify-center space-y-6">
                    <img src="/trophy.png" alt="Trophy" className="w-14 h-14" />
                    <div className="scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl">
                      <BracketCell
                        matchId={bracket[finalIndex].match_id}
                        season={season}
                      />
                    </div>
                    <div className="bg-white rounded-lg px-2 py-1 shadow text-center">
                      <p className="text-base ">
                        Congrats to the 2025 Champs, [College]!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Semis */}
                <div className="flex flex-col items-center">
                  <span className="mb-4 bg-blue-300 text-blue-900 text-m font-semibold px-4 py-1 rounded-full shadow-sm">
                    Semifinals
                  </span>
                  <div className="-ml-6 flex flex-col items-start justify-center space-y-48">
                    <div
                      className="scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                      key={bracket[rightSemiIndex].match_id}
                    >
                      <BracketCell
                        matchId={bracket[rightSemiIndex].match_id}
                        season={season}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Quarters */}
                <div className="flex flex-col items-center">
                  <span className="mb-4 bg-blue-300 text-blue-900 text-m font-semibold px-4 py-1 rounded-full shadow-sm">
                    Quarterfinals
                  </span>
                  <div className="-ml-4 flex flex-col items-start justify-center space-y-36">
                    {rightQuarterIndices.map((index) => {
                      const match = bracket[index];
                      return (
                        <div
                          className="scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                          key={match.match_id}
                        >
                          <BracketCell
                            matchId={match.match_id}
                            season={season}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Playoffs */}
                <div className="flex flex-col items-center">
                  <span className="mb-4 bg-blue-300 text-blue-900 text-m font-semibold px-4 py-1 rounded-full shadow-sm">
                    Playoffs
                  </span>
                  <div className="flex flex-col items-start space-y-20">
                    {rightPlayoffIndices.map((index) => {
                      const match = bracket[index];
                      return (
                        <div
                          className="scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                          key={match.match_id}
                        >
                          <BracketCell
                            matchId={match.match_id}
                            season={season}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 mt-10">
            No bracket available.
          </p>
        )}
      </div>
    </div>
  );
};

export default BracketsPage;

// export default withRoleProtectedRoute(BracketsPage, ["dev"]); // temporary until the page is ready
