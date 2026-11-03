"use client";
import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import GlassDropdown from "@/components/ui/GlassDropdown";
import { bracketIdOf, playoffsName } from "@/lib/brackets";
import { useBracket } from "@/hooks/useBracket";
import { useRef } from "react";
import BracketCell from "@/components/brackets/BracketCell";
import { useSeason, useSeasonDetail } from "@/context/SeasonContext";
import LoadingScreen from "@/components/layout/LoadingScreen";
import { useNavbar } from "@/context/NavbarContext";
import PageHeading from "@/components/layout/PageHeading";
import { getVersionedImage } from "@/lib/images";
import useElementHeight from "@/hooks/useElementHeight";
import BracketConnectorSvg, {
  WINNER_EDGES,
  useBracketConnectors,
  buildTeamConnections,
} from "@/components/brackets/bracketConnectors";

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
  const { currentSeason, pastSeasonIds, seasonLoading } = useSeason();
  // The sport (id) and the season (the current one until one is picked).
  const [sport, setSport] = useState<string>("");
  const [pickedSeason, setSeason] = useState<string | null>(null);
  const season = pickedSeason ?? currentSeason?.id ?? "";
  const sports = useSeasonDetail(season || null)?.sports ?? [];
  const sportName = sports.find((s) => s.id === sport)?.name ?? "";
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);
  // console.log("Hovered Team:", hoveredTeam);

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

  // The sport's playoffs that season, a cell per slot.
  const playoffs = useBracket(
    sportName ? season : undefined,
    sportName ? bracketIdOf(playoffsName(sportName)) : null
  );
  const { cells: bracket, loading } = playoffs;
  const error =
    playoffs.error === "not-found"
      ? `Bracket for ${sportName} (${season}) not found`
      : playoffs.error && "Bracket doesn't yet exist!";

  // Connector geometry is measured from the rendered cells, so the lines stay
  // aligned without the hand-tuned coordinates this page used to carry.
  const matchesReady = Boolean(bracket && bracket.length > 0);
  const dayOf = (index: number) => {
    const date = new Date(bracket![index].time);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const { ref: headerRef, height: headerHeight } = useElementHeight();

  const { containerRef, setCellRef, connectors, canvas } = useBracketConnectors(
    WINNER_EDGES,
    matchesReady
  );

  const teamConnections = useMemo(
    () => buildTeamConnections(WINNER_EDGES, bracket),
    [bracket]
  );

  const activeEdges = useMemo(
    () => new Set(hoveredTeam ? teamConnections[hoveredTeam] || [] : []),
    [hoveredTeam, teamConnections]
  );

  if (seasonLoading || loading) {
    return <LoadingScreen />;
  }

  // TODO: remove when mobile view is ready
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col">
        <PageHeading heading="Brackets" />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 px-8 py-10 max-w-sm mx-auto">
            <div className="text-5xl mb-4">📱</div>
            <h1 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">
              Desktop Only
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Brackets are best viewed on a larger screen.
              <br />
              Check it out on desktop!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col pt-16 pb-16`}>
      {/* Grouping the header into one block keeps these out of the root flex
          container, where `mx-auto` would shrink them to their content width,
          and gives one element to measure for the centring offset below. */}
      <div ref={headerRef}>
        <PageHeading heading="Brackets" />

        {/* Sport Selector & Actions */}
        <div className="relative z-30 w-full max-w-5xl mx-auto rounded-2xl px-6 py-3 flex flex-wrap justify-between items-center mb-4 gap-4 bg-white/70 dark:bg-slate-900/80 backdrop-blur-md border border-blue-200/60 dark:border-blue-400/10 shadow-lg shadow-blue-100/50 dark:shadow-blue-500/5">
        <div className="flex justify-between w-full">
          {/* Sport on left */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-blue-400 dark:text-gray-500 uppercase tracking-wide">Sport</span>
            <GlassDropdown
              placeholder="Select Sport"
              value={sport}
              options={sports.map((s) => ({ value: s.id, label: s.name, icon: <span>{s.emoji}</span> }))}
              onChange={handleSportChange}
              allowReset={false}
            />
          </div>

          {/* Year on right */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-blue-400 dark:text-gray-500 uppercase tracking-wide">Year</span>
            <GlassDropdown
              placeholder={currentSeason?.id ?? ""}
              value={season}
              options={[
                { value: currentSeason?.id ?? "", label: `${currentSeason?.id ?? ""} (Current)` },
                ...pastSeasonIds
                  .filter((y) => y !== currentSeason?.id)
                  .map((y) => ({ value: y, label: y })),
              ]}
              onChange={handleSeasonChange}
              allowReset={false}
            />
          </div>
        </div>
        </div>
      </div>

      {/* Column Titles Row */}
      <section
        className="flex-1 flex flex-col justify-center items-center"
        style={{ paddingBottom: headerHeight }}
      >
        {/* <div className="absolute inset-0 bg-[url('/bracket-overlay.png')] bg-cover bg-center opacity-45 z-0 pointer-events-none mt-12 backdrop-blur-3xl"></div> */}

        {/* Bracket Columns */}
        {bracket ? (
          <div className="w-[100%] flex flex-col justify-center items-center max-w-[1650px]">
            <div
              ref={containerRef}
              className={`${collapsed ? "w-[90%]" : "w-[100%]"}  mx-auto relative`}
            >
              <div className=" grid grid-cols-7 h-full items-start">
                {/* Desktop View */}

                <div className="flex flex-col items-center">
                  <span className="bg-blue-100 dark:bg-blue-900/50 backdrop-blur-md text-blue-700 dark:text-blue-200 text-[10px] font-semibold px-3 py-1 rounded-full border border-blue-200 dark:border-blue-400/20 shadow-sm shadow-blue-100/30 dark:shadow-blue-500/10">
                    Playoffs {dayOf(0)}
                  </span>

                  {/* Left Playoffs */}
                  <div className="flex flex-col items-end space-y-5">
                    {leftPlayoffIndices.map((index) => {
                      const cell = bracket[index];
                      return (
                        <div
                          className="scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                          key={cell.slot}
                          ref={setCellRef(cell.slot)}
                        >
                          <BracketCell cell={cell} setHoveredTeam={setHoveredTeam} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Left Quarters */}
                <div className="flex flex-col items-center justify-center">
                  <span className="bg-blue-100 dark:bg-blue-900/50 backdrop-blur-md text-blue-700 dark:text-blue-200 mb-[70px] text-[10px] font-semibold px-3 py-1 rounded-full border border-blue-200 dark:border-blue-400/20 shadow-sm shadow-blue-100/30 dark:shadow-blue-500/10">
                    Quarter-Finals {dayOf(5)}
                  </span>
                  <div className="flex flex-col items-center justify-center space-y-40">
                    {leftQuarterIndices.map((index) => {
                      const cell = bracket[index];
                      return (
                        <div
                          className="scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                          key={cell.slot}
                          ref={setCellRef(cell.slot)}
                        >
                          <BracketCell cell={cell} setHoveredTeam={setHoveredTeam} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Left Semis */}
                <div className="flex flex-col items-center space-y-52">
                  <span className="bg-blue-100 dark:bg-blue-900/50 backdrop-blur-md text-blue-700 dark:text-blue-200 text-[10px] font-semibold px-3 py-1 rounded-full border border-blue-200 dark:border-blue-400/20 shadow-sm shadow-blue-100/30 dark:shadow-blue-500/10">
                    Semi-Finals {dayOf(12)}
                  </span>
                    <div
                      className="scale-75 space-y-22 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                      key={bracket[leftSemiIndex].slot}
                      ref={setCellRef(bracket[leftSemiIndex].slot)}
                    >
                      <BracketCell cell={bracket[leftSemiIndex]} setHoveredTeam={setHoveredTeam} />
                    </div>
                </div>

                {/* Final */}
                <div className="flex flex-col items-center space-y-14">
                  <span className="bg-yellow-100 dark:bg-yellow-600/40 backdrop-blur-md text-yellow-700 dark:text-yellow-200 text-[10px] font-bold px-3 py-1 rounded-full border border-yellow-300 dark:border-yellow-400/20 shadow-sm shadow-yellow-100/30 dark:shadow-yellow-500/15">
                    Final {dayOf(14)}
                  </span>

                  {/* Trophy container */}
                  <div className="relative flex items-center justify-center">
                    <Image
                      src={getVersionedImage("/trophy.png")}
                      alt="Trophy"
                      width={192}
                      height={192}
                      className="w-48 h-48 opacity-100 drop-shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                      unoptimized
                    />

                    {/* Overlayed final match cell */}
                    <div
                      className="absolute scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                      ref={setCellRef(bracket[finalIndex].slot)}
                    >
                      <BracketCell cell={bracket[finalIndex]} setHoveredTeam={setHoveredTeam} />
                    </div>
                  </div>
                </div>

                {/* Right Semis */}
                <div className="flex flex-col items-center space-y-52">
                  <span className="bg-blue-100 dark:bg-blue-900/50 backdrop-blur-md text-blue-700 dark:text-blue-200 text-[10px] font-semibold px-3 py-1 rounded-full border border-blue-200 dark:border-blue-400/20 shadow-sm shadow-blue-100/30 dark:shadow-blue-500/10">
                    Semi-Finals {dayOf(13)}
                  </span>
                  <div
                    className="scale-75 space-y-22 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                    key={bracket[rightSemiIndex].slot}
                    ref={setCellRef(bracket[rightSemiIndex].slot)}
                  >
                    <BracketCell cell={bracket[rightSemiIndex]} setHoveredTeam={setHoveredTeam} />
                  </div>
                </div>

                {/* Right Quarters */}
                <div className="flex flex-col items-center">
                  <span className="bg-blue-100 dark:bg-blue-900/50 backdrop-blur-md text-blue-700 dark:text-blue-200 mb-[70px] text-[10px] font-semibold px-3 py-1 rounded-full border border-blue-200 dark:border-blue-400/20 shadow-sm shadow-blue-100/30 dark:shadow-blue-500/10">
                    Quarter-Finals {dayOf(10)}
                  </span>
                  <div className=" flex flex-col items-start justify-center space-y-40">
                    {rightQuarterIndices.map((index) => {
                      const cell = bracket[index];
                      return (
                        <div
                          className="scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                          key={cell.slot}
                          ref={setCellRef(cell.slot)}
                        >
                          <BracketCell cell={cell} setHoveredTeam={setHoveredTeam} />
                        </div>);
                      })}
                  </div>
                </div>

                {/* Right Playoffs */}
                <div className="flex flex-col items-center">
                  <span className="bg-blue-100 dark:bg-blue-900/50 backdrop-blur-md text-blue-700 dark:text-blue-200 text-[10px] font-semibold px-3 py-1 rounded-full border border-blue-200 dark:border-blue-400/20 shadow-sm shadow-blue-100/30 dark:shadow-blue-500/10">
                    Playoffs {dayOf(6)}
                  </span>
                  <div className="flex flex-col items-start space-y-5">
                    {rightPlayoffIndices.map((index) => {
                      const cell = bracket[index];
                      return (
                        <div
                          className="scale-75 transition-shadow duration-200 hover:shadow-lg hover:shadow-blue-400/50 rounded-3xl"
                          key={cell.slot}
                          ref={setCellRef(cell.slot)}
                        >
                          <BracketCell cell={cell} setHoveredTeam={setHoveredTeam} />
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
              <BracketConnectorSvg
                connectors={connectors}
                canvas={canvas}
                activeEdges={activeEdges}
              />

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
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">🏆</div>
            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-1">
              {error || (!sport ? "Select a sport to view brackets" : "No bracket available")}
            </h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
              {!sport
                ? "Choose a sport and season above to see the playoff bracket."
                : "Try a different sport or season."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default BracketsPage;
