"use client";
import React, { useState, useEffect } from "react";
import { currentYear, sports } from "@src/utils/helpers";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useRef } from "react";
import BracketCell from "@src/components/Brackets/BracketCell";
import { useSeason } from "@src/context/SeasonContext";
import LoadingScreen from "@src/components/LoadingScreen";
import { useNavbar } from "@src/context/NavbarContext";
import PageHeading from "@src/components/PageHeading";

interface FirestoreBracketMatch {
  bracket_placement: number;
  match_id: string;
  round: string;
  timestamp: Timestamp;
}

export const glowIdsForConnection: Record<string, string[]> = {
  // === LEFT SIDE ===
  // Playoffs → Quarterfinals (top half)
  "1-5": ["1a", "1b"],
  "2-5": ["2a", "2b"],

  // Playoffs → Quarterfinals (bottom half)
  "3-6": ["3a", "3b"],
  "4-6": ["4a", "4b"],

  // Quarterfinals → Semifinal (left)
  "5-13": ["5a", "5b"],
  "6-13": ["6a", "6b"],

  // === RIGHT SIDE ===
  // Playoffs → Quarterfinals (top half)
  "7-11": ["7a", "7b"],
  "8-11": ["8a", "8b"],

  // Playoffs → Quarterfinals (bottom half)
  "9-12": ["9a", "9b"],
  "10-12": ["10a", "10b"],

  // Quarterfinals → Semifinal (right)
  "11-14": ["11a", "11b"],
  "12-14": ["12a", "12b"],

  // Semifinals → Final
  "13-15": ["13a", "15a"],
  "14-15": ["14a", "15a"],
};


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
  const { currentSeason, pastSeasons, seasonLoading } = useSeason();
  const pastYears = pastSeasons?.years || [];
  const [sport, setSport] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [bracket, setBracket] = useState<FirestoreBracketMatch[] | null>(null);
  const [season, setSeason] = useState<string>(currentSeason?.year || currentYear);
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);
  const [matchDetails, setMatchDetails] = useState<Record<string, any>>({});
  const [teamConnections, setTeamConnections] = useState<Record<string, { from: number; to: number }[]>>({});
  // console.log("Hovered Team:", hoveredTeam);

  const activeIds =
    hoveredTeam &&
    teamConnections[hoveredTeam]?.flatMap(
      (c) => glowIdsForConnection[`${c.from}-${c.to}`] || []
    ) || [];

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

  const handleSeasonChange = (season: string) => {
    setSeason(season);
  };

  const handleSportChange = (sport: string) => {
    setSport(sport);
  };

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
        
          const matchDocs = await Promise.all(
            matches.map(async (m) => {
              const docRef = doc(db, "matches", "seasons", season, `${m.match_id}`);
              const snapshot = await getDoc(docRef);
              return { id: m.match_id, data: snapshot.exists() ? snapshot.data() : null };
            })
          );

          const matchDataMap: Record<string, any> = {};
          matchDocs.forEach(({ id, data }) => {
            matchDataMap[id] = data;
          });
          setMatchDetails(matchDataMap);
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

  useEffect(() => {
    if (!bracket || !matchDetails) return;

    const connections: Record<string, { from: number; to: number }[]> = {};

    bracket.forEach((b) => {
      const match = matchDetails[b.match_id];
      if (!match || !match.winner || !match.next_match_id) return;

      const nextMatch = bracket.find((n) => n.match_id === match.next_match_id);
      if (!nextMatch) return;

      const nextMatchData = matchDetails[nextMatch.match_id];
      if (nextMatchData) {
        const appearsInNext = nextMatchData.home_college === match.winner || nextMatchData.away_college === match.winner;
        const wonNext = !nextMatchData.winner || nextMatchData.winner === match.winner;


        if (appearsInNext && wonNext) {
          if (!connections[match.winner]) connections[match.winner] = [];
          connections[match.winner].push({
            from: b.bracket_placement,
            to: nextMatch.bracket_placement,
          });
        }
      }

    });

    setTeamConnections(connections);
  }, [bracket, matchDetails]);

  if (seasonLoading || loading) {
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
    <div className={`min-h-screen pt-16 pb-5`}>
      <PageHeading heading="Brackets" />
      {/* <div>{hoveredTeam}</div> */}

      {/* Sport Selector & Actions */}
      <div className="max-w-3xl mx-auto bg-white dark:bg-black rounded-lg shadow px-6 py-2 flex flex-wrap justify-between items-center mb-4 gap-4">
        <div className="flex justify-between w-full">
          {/* Sport on left */}
          <div className="flex items-center gap-4">
            <span className="text-base font-semibold">Sport:</span>
            <select
              className="bg-gray-100 dark:bg-gray-800 rounded px-3 py-1"
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
            <span className="text-base font-semibold">Year:</span>
            <select
              className="bg-gray-100 dark:bg-gray-800 rounded px-3 py-1"
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

      {/* Column Titles Row */}
      <section className="flex flex-col justify-center items-center">
        {/* <div className="absolute inset-0 bg-[url('/bracket-overlay.png')] bg-cover bg-center opacity-45 z-0 pointer-events-none mt-12 backdrop-blur-3xl"></div> */}

        {/* Bracket Columns */}
        {bracket ? (
          <div className="w-[100%] flex flex-col justify-center items-center max-w-screen-2xl">
            <div className={`${collapsed ? "w-[90%]" : "w-[100%]"}  mx-auto relative`}>
              <div className=" grid grid-cols-7 h-full items-start">
                {/* Desktop View */}

                <div className="flex flex-col items-center">
                  <span className="bg-blue-300 text-blue-900 text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
                    Playoffs {bracket[0].timestamp.toDate().getDate()}/{bracket[0].timestamp.toDate().getMonth() + 1}/{bracket[0].timestamp.toDate().getFullYear()}
                  </span>

                  {/* Left Playoffs */}
                  <div className="flex flex-col items-end space-y-5">
                    {leftPlayoffIndices.map((index) => {
                      const match = bracket[index];
                      return (
                        <div
                          className="scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                          key={match.match_id}
                        >
                          <BracketCell
                            match={matchDetails[match.match_id]}
                            time={match.timestamp.toDate().toString()}
                            setHoveredTeam={setHoveredTeam}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Left Quarters */}
                <div className="flex flex-col items-center justify-center">
                  <span className="bg-blue-300 mb-[70px] text-blue-900 text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
                    Quarter-Finals {bracket[5].timestamp.toDate().getDate()}/{bracket[5].timestamp.toDate().getMonth() + 1}/{bracket[5].timestamp.toDate().getFullYear()}
                  </span>
                  <div className="flex flex-col items-center justify-center space-y-40">
                    {leftQuarterIndices.map((index) => {
                      const match = bracket[index];
                      return (
                        <div
                          className="scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                          key={match.match_id}
                        >
                          <BracketCell
                            match={matchDetails[match.match_id]}
                            time={match.timestamp.toDate().toString()}
                            setHoveredTeam={setHoveredTeam}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Left Semis */}
                <div className="flex flex-col items-center space-y-52">
                  <span className="bg-blue-300 text-blue-900 text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
                    Semi-Finals {bracket[12].timestamp.toDate().getDate()}/{bracket[12].timestamp.toDate().getMonth() + 1}/{bracket[12].timestamp.toDate().getFullYear()}
                  </span>
                    <div
                      className="scale-75 space-y-22 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                      key={bracket[leftSemiIndex].match_id}
                    >
                      <BracketCell
                        match={matchDetails[bracket[leftSemiIndex].match_id]}
                        time={bracket[leftSemiIndex].timestamp.toDate().toString()}
                        setHoveredTeam={setHoveredTeam}
                      />
                    </div>
                </div>

                {/* Final */}
                <div className="flex flex-col items-center space-y-14">
                  <span className="bg-blue-300 text-blue-900 text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
                    Final {bracket[14].timestamp.toDate().getDate()}/{bracket[14].timestamp.toDate().getMonth() + 1}/{bracket[14].timestamp.toDate().getFullYear()}
                  </span>

                  {/* Trophy container */}
                  <div className="relative flex items-center justify-center">
                    <img
                      src="/trophy.png"
                      alt="Trophy"
                      className="w-48 h-48 opacity-100 drop-shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                    />

                    {/* Overlayed final match cell */}
                    <div className="absolute scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl">
                      <BracketCell
                        match={matchDetails[bracket[finalIndex].match_id]}
                        time={bracket[finalIndex].timestamp.toDate().toString()}
                        setHoveredTeam={setHoveredTeam}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Semis */}
                <div className="flex flex-col items-center space-y-52">
                  <span className=" bg-blue-300 text-blue-900 text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
                    Semi-Finals {bracket[13].timestamp.toDate().getDate()}/{bracket[13].timestamp.toDate().getMonth() + 1}/{bracket[13].timestamp.toDate().getFullYear()}
                  </span>
                  <div
                    className="scale-75 space-y-22 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                    key={bracket[rightSemiIndex].match_id}
                  >
                    <BracketCell
                      match={matchDetails[bracket[rightSemiIndex].match_id]}
                      time={bracket[rightSemiIndex].timestamp.toDate().toString()}
                      setHoveredTeam={setHoveredTeam}
                    />
                  </div>
                </div>

                {/* Right Quarters */}
                <div className="flex flex-col items-center">
                  <span className=" bg-blue-300 mb-[70px] text-blue-900 text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
                    Quarter-Finals {bracket[10].timestamp.toDate().getDate()}/{bracket[10].timestamp.toDate().getMonth() + 1}/{bracket[10].timestamp.toDate().getFullYear()}
                  </span>
                  <div className=" flex flex-col items-start justify-center space-y-40">
                    {rightQuarterIndices.map((index) => {
                      const match = bracket[index];
                      return (
                        <div
                          className="scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                          key={match.match_id}
                        >
                          <BracketCell
                            match={matchDetails[match.match_id]}
                            time={match.timestamp.toDate().toString()}
                            setHoveredTeam={setHoveredTeam}
                          />
                        </div>);
                      })}
                  </div>
                </div>

                {/* Right Playoffs */}
                <div className="flex flex-col items-center">
                  <span className=" bg-blue-300 text-blue-900 text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
                    Playoffs {bracket[6].timestamp.toDate().getDate()}/{bracket[6].timestamp.toDate().getMonth() + 1}/{bracket[6].timestamp.toDate().getFullYear()}
                  </span>
                  <div className="flex flex-col items-start space-y-5">
                    {rightPlayoffIndices.map((index) => {
                      const match = bracket[index];
                      return (
                        <div
                          className="scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                          key={match.match_id}
                        >
                          <BracketCell
                            match={matchDetails[match.match_id]}
                            time={match.timestamp.toDate().toString()}
                            setHoveredTeam={setHoveredTeam}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
              <svg
                className="absolute inset-0 w-full h-full text-yellow-500 pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
              >
                {/* === LEFT SIDE === */}
                {/* Playoffs (8 lines) */}
                <path 
                  id="1a" 
                  d="M136 149 H214" 
                  className={`glow-line ${activeIds.includes("1a") ? "active" : ""}`} 
                  stroke={activeIds.includes("1a") ? "#00FFFF" : "currentColor"} 
                  strokeWidth="5" 
                />
                <path 
                  id="1b" 
                  d="M213 147 V193" 
                  className={`glow-line ${activeIds.includes("1b") ? "active" : ""}`} 
                  stroke={activeIds.includes("1b") ? "#00FFFF" : "currentColor"} 
                  strokeWidth="2.5" 
                />

                <path
                  id="2a"
                  d="M136 398 H214"
                  className={`glow-line ${activeIds.includes("2a") ? "active" : ""}`}
                  stroke={activeIds.includes("2a") ? "#00FFFF" : "currentColor"}
                  strokeWidth="5"
                />
                <path
                  id="2b"
                  d="M213 400 V354"
                  className={`glow-line ${activeIds.includes("2b") ? "active" : ""}`}
                  stroke={activeIds.includes("2b") ? "#00FFFF" : "currentColor"}
                  strokeWidth="2.5"
                />

                <path
                  id="3a"
                  d="M136 645 H214"
                  className={`glow-line ${activeIds.includes("3a") ? "active" : ""}`}
                  stroke={activeIds.includes("3a") ? "#00FFFF" : "currentColor"}
                  strokeWidth="5"
                />
                <path
                  id="3b"
                  d="M213 643 V688"
                  className={`glow-line ${activeIds.includes("3b") ? "active" : ""}`}
                  stroke={activeIds.includes("3b") ? "#00FFFF" : "currentColor"}
                  strokeWidth="2.5"
                />

                <path
                  id="4a"
                  d="M136 894 H214"
                  className={`glow-line ${activeIds.includes("4a") ? "active" : ""}`}
                  stroke={activeIds.includes("4a") ? "#00FFFF" : "currentColor"}
                  strokeWidth="5"
                />
                <path
                  id="4b"
                  d="M213 896 V848"
                  className={`glow-line ${activeIds.includes("4b") ? "active" : ""}`}
                  stroke={activeIds.includes("4b") ? "#00FFFF" : "currentColor"}
                  strokeWidth="2.5"
                />
                {/* Quarterfinals (4 lines) */}
                <path
                  id="5a"
                  d="M279.3 273.5 H361.2"
                  className={`glow-line ${activeIds.includes("5a") ? "active" : ""}`}
                  stroke={activeIds.includes("5a") ? "#00FFFF" : "currentColor"}
                  strokeWidth="5"
                />
                <path
                  id="5b"
                  d="M360 272 V436"
                  className={`glow-line ${activeIds.includes("5b") ? "active" : ""}`}
                  stroke={activeIds.includes("5b") ? "#00FFFF" : "currentColor"}
                  strokeWidth="2.5"
                />

                <path
                  id="6a"
                  d="M279.3 768 H361.2"
                  className={`glow-line ${activeIds.includes("6a") ? "active" : ""}`}
                  stroke={activeIds.includes("6a") ? "#00FFFF" : "currentColor"}
                  strokeWidth="5"
                />
                <path
                  id="6b"
                  d="M360 770 V596.5"
                  className={`glow-line ${activeIds.includes("6b") ? "active" : ""}`}
                  stroke={activeIds.includes("6b") ? "#00FFFF" : "currentColor"}
                  strokeWidth="2.5"
                />

                {/* === RIGHT SIDE === */}
                {/* Playoffs (8 lines) */}
                <path
                  id="7a"
                  d="M864.4 149 H786"
                  className={`glow-line ${activeIds.includes("7a") ? "active" : ""}`}
                  stroke={activeIds.includes("7a") ? "#00FFFF" : "currentColor"}
                  strokeWidth="5"
                />
                <path
                  id="7b"
                  d="M787 147 V193"
                  className={`glow-line ${activeIds.includes("7b") ? "active" : ""}`}
                  stroke={activeIds.includes("7b") ? "#00FFFF" : "currentColor"}
                  strokeWidth="2.5"
                />

                <path
                  id="8a"
                  d="M864.4 398 H786"
                  className={`glow-line ${activeIds.includes("8a") ? "active" : ""}`}
                  stroke={activeIds.includes("8a") ? "#00FFFF" : "currentColor"}
                  strokeWidth="5"
                />
                <path
                  id="8b"
                  d="M787 400 V354"
                  className={`glow-line ${activeIds.includes("8b") ? "active" : ""}`}
                  stroke={activeIds.includes("8b") ? "#00FFFF" : "currentColor"}
                  strokeWidth="2.5"
                />

                <path
                  id="9a"
                  d="M864.4 645 H786"
                  className={`glow-line ${activeIds.includes("9a") ? "active" : ""}`}
                  stroke={activeIds.includes("9a") ? "#00FFFF" : "currentColor"}
                  strokeWidth="5"
                />
                <path
                  id="9b"
                  d="M787 643 V688"
                  className={`glow-line ${activeIds.includes("9b") ? "active" : ""}`}
                  stroke={activeIds.includes("9b") ? "#00FFFF" : "currentColor"}
                  strokeWidth="2.5"
                />

                <path
                  id="10a"
                  d="M864.4 894 H786"
                  className={`glow-line ${activeIds.includes("10a") ? "active" : ""}`}
                  stroke={activeIds.includes("10a") ? "#00FFFF" : "currentColor"}
                  strokeWidth="5"
                />
                <path
                  id="10b"
                  d="M787 896 V848"
                  className={`glow-line ${activeIds.includes("10b") ? "active" : ""}`}
                  stroke={activeIds.includes("10b") ? "#00FFFF" : "currentColor"}
                  strokeWidth="2.5"
                />

                {/* Quarterfinals (4 lines) */}
                <path
                  id="11a"
                  d="M721 273.5 H638.8"
                  className={`glow-line ${activeIds.includes("11a") ? "active" : ""}`}
                  stroke={activeIds.includes("11a") ? "#00FFFF" : "currentColor"}
                  strokeWidth="5"
                />
                <path
                  id="11b"
                  d="M640 272 V436"
                  className={`glow-line ${activeIds.includes("11b") ? "active" : ""}`}
                  stroke={activeIds.includes("11b") ? "#00FFFF" : "currentColor"}
                  strokeWidth="2.5"
                />

                <path
                  id="12a"
                  d="M721 768 H638.8"
                  className={`glow-line ${activeIds.includes("12a") ? "active" : ""}`}
                  stroke={activeIds.includes("12a") ? "#00FFFF" : "currentColor"}
                  strokeWidth="5"
                />
                <path
                  id="12b"
                  d="M640 770 V596.5"
                  className={`glow-line ${activeIds.includes("12b") ? "active" : ""}`}
                  stroke={activeIds.includes("12b") ? "#00FFFF" : "currentColor"}
                  strokeWidth="2.5"
                />

                {/* === SEMIS → FINAL (2 lines) === */}
                <path
                  id="13a"
                  d="M422.1 516.7 H501.2"
                  className={`glow-line ${activeIds.includes("13a") ? "active" : ""}`}
                  stroke={activeIds.includes("13a") ? "#00FFFF" : "currentColor"}
                  strokeWidth="5"
                />
                <path
                  id="14a"
                  d="M498.8 516.7 H578.3"
                  className={`glow-line ${activeIds.includes("14a") ? "active" : ""}`}
                  stroke={activeIds.includes("14a") ? "#00FFFF" : "currentColor"}
                  strokeWidth="5"
                />
                <path
                  id="15a"
                  d="M500 518.6 V396"
                  className={`glow-line ${activeIds.includes("15a") ? "active" : ""}`}
                  stroke={activeIds.includes("15a") ? "#00FFFF" : "currentColor"}
                  strokeWidth="2.5"
                />
              </svg>

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
      </section>
    </div>
  );
};

export default BracketsPage;
