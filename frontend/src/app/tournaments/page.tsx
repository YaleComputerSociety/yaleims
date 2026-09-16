"use client";

import React, { useState, useEffect, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { currentYear } from "@src/utils/helpers";
import GlassDropdown from "@src/components/ui/GlassDropdown";
import BracketCell from "@src/components/Brackets/BracketCell";
import PlacementPanel from "@src/components/Tournaments/PlacementPanel";
import { useSeason } from "@src/context/SeasonContext";
import LoadingScreen from "@src/components/LoadingScreen";
import { useNavbar } from "@src/context/NavbarContext";
import PageHeading from "@src/components/PageHeading";
import { getVersionedImage } from "@/utils/versionedImages";
import useElementHeight from "@src/hooks/useElementHeight";
import { Tournament, TournamentBracketMatch } from "@src/types/components";
import BracketConnectorSvg, {
  TOURNAMENT_EDGES,
  useBracketConnectors,
  buildTeamConnections,
} from "@src/components/Brackets/bracketConnectors";

// Tournaments reuse the 14-team playoff shape, so slot n lives at index n - 1.
const LEFT_PLAYOFF_INDICES = [0, 1, 2, 3];
const LEFT_QUARTER_INDICES = [4, 5];
const LEFT_SEMI_INDEX = 12;
const RIGHT_PLAYOFF_INDICES = [6, 7, 8, 9];
const RIGHT_QUARTER_INDICES = [10, 11];
const RIGHT_SEMI_INDEX = 13;
const FINAL_INDEX = 14;
const THIRD_PLACE_INDEX = 15;

const columnBadge =
  "bg-blue-100 dark:bg-blue-900/50 backdrop-blur-md text-blue-700 dark:text-blue-200 text-[10px] font-semibold px-3 py-1 rounded-full border border-blue-200 dark:border-blue-400/20 shadow-sm shadow-blue-100/30 dark:shadow-blue-500/10";

const cellWrapper =
  "scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl";

const formatDate = (millis: number | null): string => {
  if (!millis) return "";
  const date = new Date(millis);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

const TournamentsPage: React.FC = () => {
  const { collapsed } = useNavbar();
  const [isMobile, setIsMobile] = useState(false);
  const { currentSeason, pastSeasons, seasonLoading } = useSeason();
  const pastYears = pastSeasons?.years || [];

  const [season, setSeason] = useState<string>(
    currentSeason?.year || currentYear
  );
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [matchDetails, setMatchDetails] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Tournament list for the season, refetched whenever the year changes.
  useEffect(() => {
    if (!season) return;

    const fetchTournaments = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/functions/getTournaments?year=${encodeURIComponent(season)}`
        );
        if (!response.ok) throw new Error("Failed to load tournaments");

        const data = await response.json();
        const list: Tournament[] = data.tournaments || [];
        setTournaments(list);
        setSelectedId(list.length > 0 ? list[0].id : "");
        if (list.length === 0) {
          setError(`No tournaments have been created for ${season} yet.`);
        }
      } catch (err) {
        console.error("Error fetching tournaments:", err);
        setTournaments([]);
        setSelectedId("");
        setError("Could not load tournaments.");
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [season]);

  const selected = useMemo(
    () => tournaments.find((t) => t.id === selectedId) || null,
    [tournaments, selectedId]
  );

  const bracket: TournamentBracketMatch[] | null = useMemo(() => {
    if (!selected) return null;
    return [...selected.matches].sort(
      (a, b) => a.bracket_placement - b.bracket_placement
    );
  }, [selected]);

  // Live match docs carry the scores and advancing teams; the tournament doc
  // only stores the bracket skeleton.
  useEffect(() => {
    if (!bracket || !season) {
      setMatchDetails({});
      return;
    }

    let cancelled = false;

    const fetchMatches = async () => {
      try {
        setError(null);
        const docs = await Promise.all(
          bracket.map(async (m) => {
            const ref = doc(db, "matches", "seasons", season, `${m.match_id}`);
            const snapshot = await getDoc(ref);
            return { id: m.match_id, data: snapshot.exists() ? snapshot.data() : null };
          })
        );

        if (cancelled) return;

        const map: Record<string, any> = {};
        docs.forEach(({ id, data }) => {
          map[id] = data;
        });
        setMatchDetails(map);
      } catch (err) {
        // Without this the readiness gate below would wait forever on a bracket
        // whose matches can never load.
        if (cancelled) return;
        console.error("Error fetching tournament matches:", err);
        setError("Could not load this tournament's matches.");
      }
    };

    fetchMatches();
    return () => {
      cancelled = true;
    };
  }, [bracket, season]);

  // Match docs load in a second pass, and effects run after render, so a
  // loading flag would still leave one render with no data. Derive readiness
  // from the fetched map instead: a missing doc is stored as null, so only
  // `undefined` means "not fetched yet".
  const matchesReady = Boolean(
    bracket &&
      bracket.length > 0 &&
      bracket.every((m) => matchDetails[m.match_id] !== undefined)
  );

  const { ref: headerRef, height: headerHeight } = useElementHeight();

  const { containerRef, setCellRef, connectors, canvas } = useBracketConnectors(
    TOURNAMENT_EDGES,
    matchesReady
  );

  const teamConnections = useMemo(
    () => buildTeamConnections(TOURNAMENT_EDGES, bracket, matchDetails),
    [bracket, matchDetails]
  );

  const activeEdges = useMemo(
    () => new Set(hoveredTeam ? teamConnections[hoveredTeam] || [] : []),
    [hoveredTeam, teamConnections]
  );

  const renderCell = (index: number) => {
    if (!bracket || !bracket[index]) return null;
    const match = bracket[index];
    return (
      <div
        className={cellWrapper}
        key={match.match_id}
        ref={setCellRef(match.bracket_placement)}
      >
        <BracketCell
          match={matchDetails[match.match_id]}
          time={match.timestamp ? new Date(match.timestamp).toString() : ""}
          setHoveredTeam={setHoveredTeam}
        />
      </div>
    );
  };

  if (seasonLoading || loading) {
    return <LoadingScreen />;
  }

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col">
        <PageHeading heading="Tournaments" />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 px-8 py-10 max-w-sm mx-auto">
            <div className="text-5xl mb-4">📱</div>
            <h1 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">
              Desktop Only
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tournament brackets are best viewed on a larger screen.
              <br />
              Check it out on desktop!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pt-16 pb-16">
      {/* Grouping the header into one block keeps these out of the root flex
          container, where `mx-auto` would shrink them to their content width,
          and gives one element to measure for the centring offset below. */}
      <div ref={headerRef}>
        <PageHeading heading="Tournaments" />

      {/* Tournament & season selectors */}
      <div className="relative z-30 w-full max-w-5xl mx-auto rounded-2xl px-6 py-3 flex flex-wrap justify-between items-center mb-4 gap-4 bg-white/70 dark:bg-slate-900/80 backdrop-blur-md border border-blue-200/60 dark:border-blue-400/10 shadow-lg shadow-blue-100/50 dark:shadow-blue-500/5">
        <div className="flex justify-between w-full">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-blue-400 dark:text-gray-500 uppercase tracking-wide">
              Tournament
            </span>
            <GlassDropdown
              placeholder="Select Tournament"
              value={selectedId}
              options={tournaments.map((t) => ({
                value: t.id,
                label: t.name,
              }))}
              onChange={setSelectedId}
              allowReset={false}
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-blue-400 dark:text-gray-500 uppercase tracking-wide">
              Year
            </span>
            <GlassDropdown
              placeholder={currentSeason?.year || currentYear}
              value={season}
              options={[
                {
                  value: currentSeason?.year || currentYear,
                  label: `${currentSeason?.year || currentYear} (Current)`,
                },
                ...pastYears
                  .filter((y: string) => y !== (currentSeason?.year || currentYear))
                  .map((y: string) => ({ value: y, label: y })),
              ]}
              onChange={setSeason}
              allowReset={false}
            />
          </div>
        </div>
      </div>

        {selected && <PlacementPanel tournament={selected} />}
      </div>

      <section
        className="flex-1 flex flex-col justify-center items-center"
        style={{ paddingBottom: headerHeight }}
      >
        {bracket && selected && matchesReady ? (
          <div className="w-full flex flex-col justify-center items-center max-w-[1650px]">
            <div
              ref={containerRef}
              className={`${collapsed ? "w-[90%]" : "w-full"} mx-auto relative`}
            >
              <div className="grid grid-cols-7 h-full items-start">
                {/* Left first round */}
                <div className="flex flex-col items-center">
                  <span className={columnBadge}>
                    Round 1 {formatDate(bracket[0].timestamp)}
                  </span>
                  <div className="flex flex-col items-end space-y-5">
                    {LEFT_PLAYOFF_INDICES.map(renderCell)}
                  </div>
                </div>

                {/* Left quarters */}
                <div className="flex flex-col items-center justify-center">
                  <span className={`${columnBadge} mb-[70px]`}>
                    Quarter-Finals {formatDate(bracket[4].timestamp)}
                  </span>
                  <div className="flex flex-col items-center justify-center space-y-40">
                    {LEFT_QUARTER_INDICES.map(renderCell)}
                  </div>
                </div>

                {/* Left semi */}
                <div className="flex flex-col items-center space-y-52">
                  <span className={columnBadge}>
                    Semi-Finals {formatDate(bracket[LEFT_SEMI_INDEX].timestamp)}
                  </span>
                  {renderCell(LEFT_SEMI_INDEX)}
                </div>

                {/* Final and third place game */}
                <div className="flex flex-col items-center space-y-14">
                  <span className="bg-yellow-100 dark:bg-yellow-600/40 backdrop-blur-md text-yellow-700 dark:text-yellow-200 text-[10px] font-bold px-3 py-1 rounded-full border border-yellow-300 dark:border-yellow-400/20 shadow-sm shadow-yellow-100/30 dark:shadow-yellow-500/15">
                    Final {formatDate(bracket[FINAL_INDEX].timestamp)}
                  </span>

                  <div className="relative flex items-center justify-center">
                    <img
                      src={getVersionedImage("/trophy.png")}
                      alt="Trophy"
                      className="w-48 h-48 opacity-100 drop-shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                    />
                    <div
                      ref={setCellRef(bracket[FINAL_INDEX].bracket_placement)}
                      className="absolute scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                    >
                      <BracketCell
                        match={matchDetails[bracket[FINAL_INDEX].match_id]}
                        time={
                          bracket[FINAL_INDEX].timestamp
                            ? new Date(bracket[FINAL_INDEX].timestamp!).toString()
                            : ""
                        }
                        setHoveredTeam={setHoveredTeam}
                      />
                    </div>
                  </div>

                  {bracket[THIRD_PLACE_INDEX] && (
                    <div className="flex flex-col items-center gap-2">
                      <span className="bg-orange-100 dark:bg-orange-700/40 backdrop-blur-md text-orange-700 dark:text-orange-200 text-[10px] font-bold px-3 py-1 rounded-full border border-orange-300 dark:border-orange-400/20 shadow-sm shadow-orange-100/30 dark:shadow-orange-500/15">
                        3rd Place {formatDate(bracket[THIRD_PLACE_INDEX].timestamp)}
                      </span>
                      {renderCell(THIRD_PLACE_INDEX)}
                    </div>
                  )}
                </div>

                {/* Right semi */}
                <div className="flex flex-col items-center space-y-52">
                  <span className={columnBadge}>
                    Semi-Finals {formatDate(bracket[RIGHT_SEMI_INDEX].timestamp)}
                  </span>
                  {renderCell(RIGHT_SEMI_INDEX)}
                </div>

                {/* Right quarters */}
                <div className="flex flex-col items-center">
                  <span className={`${columnBadge} mb-[70px]`}>
                    Quarter-Finals {formatDate(bracket[10].timestamp)}
                  </span>
                  <div className="flex flex-col items-start justify-center space-y-40">
                    {RIGHT_QUARTER_INDICES.map(renderCell)}
                  </div>
                </div>

                {/* Right first round */}
                <div className="flex flex-col items-center">
                  <span className={columnBadge}>
                    Round 1 {formatDate(bracket[6].timestamp)}
                  </span>
                  <div className="flex flex-col items-start space-y-5">
                    {RIGHT_PLAYOFF_INDICES.map(renderCell)}
                  </div>
                </div>
              </div>

              <BracketConnectorSvg
                connectors={connectors}
                canvas={canvas}
                activeEdges={activeEdges}
              />
            </div>
          </div>
        ) : (
          <div className="text-center bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 px-8 py-10 max-w-md mx-auto mt-6">
            <div className="text-5xl mb-4">🏐</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {error
                ? error
                : selected && !matchesReady
                ? "Loading bracket…"
                : "Select a tournament to view its bracket."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default TournamentsPage;
