"use client";
import React, { useState, useEffect } from "react";
import { currentYear, sports } from "@src/utils/helpers";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useRef } from "react";
import BracketCell from "@src/components/Brackets/BracketCell";
import { useSeason } from "@src/context/SeasonContext";
import LoadingScreen from "@src/components/LoadingScreen";
import { useNavbar } from "@src/context/NavbarContext";

interface FirestoreBracketMatch {
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
  const { collapsed } = useNavbar();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
  const [bracket, setBracket] = useState<FirestoreBracketMatch[] | null>(null);
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
          const matches = bracketDoc.data()?.matches as FirestoreBracketMatch[];
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

  // TODO: remove when mobile view is ready
  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-100">
        <div className="text-center bg-white rounded-lg shadow px-6 py-8 max-w-sm mx-auto">
          <h1 className="text-2xl font-bold mb-4 text-blue-700">
            Brackets Mobile View
          </h1>
          <p className="text-lg text-gray-700">
            Brackets mobile view coming soon.
            <br />
            Check it out on desktop!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-blue-100 py-10`}>
      <h1 className="text-center text-4xl font-extrabold tracking-tight text-gray-800 mb-4">
        Brackets
      </h1>

      {/* Welcome Message */}
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow px-6 py-4 text-center text-lg text-gray-700 mb-4">
        <p className="font-bold mb-2">
          Welcome to YaleIMS's newest feature — the Brackets Page!
        </p>
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

      <div className={`{collapsed ? "pl-[80px] : "pl-[320px]"} pr-6`}>
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
            <div className="flex w-fit">
              <div className=" grid grid-cols-7 gap-50 items-start">
                {/* Desktop View */}

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
                          <BracketCell matchId={match.match_id} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Left Quarters */}
                <div className="space-y-24 flex flex-col items-center">
                  <span className="mb-4 bg-blue-300 text-blue-900 text-m font-semibold px-4 py-1 rounded-full shadow-sm">
                    Quarterfinals
                  </span>
                  <div className="ml-4 flex flex-col items-end justify-center space-y-80">
                    {leftQuarterIndices.map((index) => {
                      const match = bracket[index];
                      return (
                        <div
                          className="scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                          key={match.match_id}
                        >
                          <BracketCell matchId={match.match_id} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Left Semis */}
                <div className="flex flex-col items-center space-y-60">
                  <span className="mb-4 bg-blue-300 text-blue-900 text-m font-semibold px-4 py-1 rounded-full shadow-sm">
                    Semifinals
                  </span>
                  <div className="ml-6 flex flex-col items-end justify-center space-y-48">
                    <div
                      className="scale-75 space-y-48 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                      key={bracket[leftSemiIndex].match_id}
                    >
                      <BracketCell matchId={bracket[leftSemiIndex].match_id} />
                    </div>
                  </div>
                </div>

                {/* Final */}
                <div className="flex flex-col items-center space-y-24">
                  <span className="mb-4 bg-blue-300 text-blue-900 text-m font-semibold px-4 py-1 rounded-full shadow-sm">
                    Finals
                  </span>
                  <div className="flex flex-col items-center justify-center space-y-6">
                    {/* Trophy container */}
                    {/* <div className="relative flex items-center justify-center"> */}
                    {/* Trophy image */}
                    <img
                      src="/trophy.png"
                      alt="Trophy"
                      className="w-48 h-48 opacity-100 animate-pulse [animation-duration:4s] drop-shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                    />{" "}
                    */
                    {/* Overlay: winner flag or ? */}
                    {/* {bracket[finalIndex]?.winner ? (
                      // TODO: Hook up to backend if we have a "first place" label.
                      // This should add the winner's flag over the trophy or have a question mark if not determined yet!
                      <img
                        src={`/flags/${bracket[finalIndex].winner}.png`} // adjust to the flag asset
                        alt={`${bracket[finalIndex].winner} flag`}
                        className="absolute w-20 h-20 rounded-full border-4 border-white shadow-lg"
                      />
                    ) : (
                      <span className="absolute y-20 text-white text-6xl font-bold animate-pulse [animation-duration:4s] drop-shadow-[0_0_25px_rgba(59,130,246,0.9)]">
                        ?
                      </span>
                    )} */}
                  </div>
                  {/* Final match cell */}
                  <div className="scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl">
                    <BracketCell matchId={bracket[finalIndex].match_id} />
                  </div>
                  {/* Congrats message */}
                  {/* {bracket[finalIndex]?.winner && (
                      <div className="bg-white rounded-lg px-2 py-1 shadow text-center">
                        <p className="text-base font-semibold">
                          Congrats to the 2025 Champs,{" "}
                          {bracket[finalIndex].winner}!
                        </p>
                      </div>
                    )} */}
                  {/* </div> */}
                </div>

                {/* Right Semis */}
                <div className="flex flex-col items-center space-y-60">
                  <span className="mb-4 bg-blue-300 text-blue-900 text-m font-semibold px-4 py-1 rounded-full shadow-sm ">
                    Semifinals
                  </span>
                  <div className="-ml-6 flex flex-col items-start justify-center space-y-48">
                    <div
                      className="scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                      key={bracket[rightSemiIndex].match_id}
                    >
                      <BracketCell matchId={bracket[rightSemiIndex].match_id} />
                    </div>
                  </div>
                </div>

                {/* Right Quarters */}
                <div className="space-y-24 flex flex-col items-center">
                  <span className="mb-4 bg-blue-300 text-blue-900 text-m font-semibold px-4 py-1 rounded-full shadow-sm">
                    Quarterfinals
                  </span>
                  <div className="-ml-4 flex flex-col items-start justify-center space-y-80">
                    {rightQuarterIndices.map((index) => {
                      const match = bracket[index];
                      return (
                        <div
                          className="scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                          key={match.match_id}
                        >
                          <BracketCell matchId={match.match_id} />
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
                          <BracketCell matchId={match.match_id} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile view (scaled + scrollable) */}
            <div className="flex sm:hidden w-fit transform scale-50 origin-top-left">
              <div className="grid grid-cols-7 gap-20 items-start">
                {/* Reuse same structure as desktop */}
                {/* You can literally copy all the same JSX from above into here */}
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
