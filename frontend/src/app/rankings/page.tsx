"use client";

import React, { useState, useMemo } from "react";
import PageHeading from "@src/components/PageHeading";
import RankingsTable, { RankingEntry } from "@src/components/Rankings/RankingsTable";
import { useSeason } from "@src/context/SeasonContext";
import { currentYear, emojiMap } from "@src/utils/helpers";
import { sports } from "@src/utils/helpers";
import GlassDropdown from "@src/components/ui/GlassDropdown";

// ─── types ────────────────────────────────────────────────────────────────────
type MainTab = "overall" | "per-sport";
type SportTab = string;

interface TabConfig {
  id: MainTab;
  label: string;
}

interface SportTabConfig {
  id: SportTab;
  label: string;
  emoji: string;
}

const MAIN_TABS: TabConfig[] = [
  { id: "overall", label: "Overall Rankings" },
  { id: "per-sport", label: "Per Sport Rankings" },
];

const SPORT_TABS: SportTabConfig[] = sports.map((sport) => ({
  id: sport.name,
  label: sport.name,
  emoji: emojiMap[sport.name] || sport.emoji,
}));

// ─── test data ────────────────────────────────────────────────────────────────
const COLLEGES = [
  { id: "BF", name: "Benjamin Franklin" },
  { id: "BK", name: "Berkeley" },
  { id: "BR", name: "Branford" },
  { id: "DC", name: "Davenport" },
  { id: "ES", name: "Ezra Stiles" },
  { id: "GH", name: "Grace Hopper" },
  { id: "JE", name: "Jonathan Edwards" },
  { id: "MC", name: "Morse" },
  { id: "PM", name: "Pauli Murray" },
  { id: "PC", name: "Pierson" },
  { id: "SY", name: "Saybrook" },
  { id: "SM", name: "Silliman" },
  { id: "TD", name: "Timothy Dwight" },
  { id: "TC", name: "Trumbull" },
];

// Generate fictional ELO ratings for overall rankings
const generateOverallRankings = (): RankingEntry[] => {
  const baseElos = [
    1650, 1620, 1590, 1560, 1530, 1520, 1510, 1500, 1480, 1450, 1420, 1380,
    1350, 1300,
  ];

  return COLLEGES.map((college, idx) => ({
    id: college.id,
    name: college.name,
    elo: baseElos[idx],
    rank: idx + 1,
  }));
};

// Generate fictional ELO ratings for per-sport rankings
const generateSportRankings = (sport: SportTab): RankingEntry[] => {
  // Use the sport name as a seed for pseudo-random number generation
  const seed = sport.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Generate deterministic but varied ELO values based on sport name
  const baseElos = COLLEGES.map((_, idx) => {
    const random = Math.sin(seed + idx * 12.9898) * 43758.5453;
    const normalized = random - Math.floor(random);
    return Math.floor(1250 + normalized * 450);
  }).sort((a, b) => b - a);

  // Shuffle colleges for this sport using the seed
  const shuffledColleges = [...COLLEGES].sort(
    (a, b) => (seed + a.id.charCodeAt(0)) - (seed + b.id.charCodeAt(0))
  );

  return shuffledColleges.map((college, idx) => ({
    id: college.id,
    name: college.name,
    elo: baseElos[idx],
    rank: idx + 1,
  }));
};

// ─── component ─────────────────────────────────────────────────────────────────
const RankingsPage: React.FC = () => {
  const { currentSeason, pastSeasons } = useSeason();
  const defaultSeasonYear = currentSeason?.year ?? currentYear;
  const pastYears: string[] = pastSeasons?.years || [];
  const allSeasons = [defaultSeasonYear, ...pastYears];

  const [selectedSeason, setSelectedSeason] = useState<string>(defaultSeasonYear);
  const [mainTab, setMainTab] = useState<MainTab>("overall");
  const [sportTab, setSportTab] = useState<SportTab>(sports[0]?.name || "Flag Football");

  const overallRankings = useMemo(() => generateOverallRankings(), []);
  const sportRankings = useMemo(
    () => generateSportRankings(sportTab),
    [sportTab]
  );

  const seasonOptions = [
    { value: defaultSeasonYear, label: `${defaultSeasonYear} (Current)` },
    ...pastYears
      .filter((y) => y !== defaultSeasonYear)
      .map((y) => ({ value: y, label: y })),
  ];

  return (
    <div className="min-h-screen">
      <PageHeading heading="Power Rankings" />

      <div className="mt-20 md:mt-16 px-3 sm:px-6 max-w-6xl mx-auto pb-10">
        {/* Season Filter */}
        <div className="mb-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              Season
            </span>
            <GlassDropdown
              placeholder={defaultSeasonYear}
              value={selectedSeason}
              options={seasonOptions}
              onChange={setSelectedSeason}
              allowReset={false}
            />
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex gap-2 border-b border-gray-300 dark:border-gray-700 mb-6">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id)}
              className={`px-4 py-3 font-medium text-sm transition-all duration-200 border-b-2 ${
                mainTab === tab.id
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overall Rankings Content */}
        {mainTab === "overall" && (
          <div className="mt-6">
            <RankingsTable rankings={overallRankings} />
          </div>
        )}

        {/* Per Sport Rankings Content */}
        {mainTab === "per-sport" && (
          <div className="mt-6">
            {/* Sport Dropdown */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sport
              </p>
              <GlassDropdown
                placeholder="Select a sport"
                value={sportTab}
                options={SPORT_TABS.map((tab) => ({ 
                  value: tab.id, 
                  label: `${tab.emoji} ${tab.label}` 
                }))}
                onChange={setSportTab}
                allowReset={false}
              />
            </div>

            {/* Sport Rankings Table */}
            <RankingsTable rankings={sportRankings} />
          </div>
        )}
      </div>
    </div>
  );
};

export default RankingsPage;
