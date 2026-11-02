"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/layout/LoadingScreen";
import PageHeading from "@/components/layout/PageHeading";
import { useSeason } from "@/context/SeasonContext";
import { useChampionship } from "@/hooks/useChampionship";
import { useStandings } from "@/hooks/useStandings";
import { useConfettiEnabled } from "@/hooks/useConfettiEnabled";
import Title from "./Title";
import YearlyLeaderboardTable from "./YearlyLeaderboardTable";
import { YearlyPodiums } from "./YearlyPodiums";
import AllTimePodiums from "./AllTimePodiums";
import AllTimeLeaderboardTable from "./AllTimeLeaderboard";
import ChampionConfetti from "./ChampionConfetti";

// Site-wide announcement banner: set SHOW_BANNER and a message to use it.
const SHOW_BANNER = false;
const BANNER_MESSAGE = "";

const ALL_TIME = "All Time";

/** The home page: a season's standings (live), or the all-time table. */
const AAHomeComponent: React.FC = () => {
  const router = useRouter();
  const { currentSeason, seasonLoading } = useSeason();
  // The season picked in the title; the current one until then.
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? currentSeason?.id ?? null;
  const standings = useStandings(selected === ALL_TIME ? null : selected);
  const [bannerOpen, setBannerOpen] = useState(true);
  const championship = useChampionship();
  const confettiEnabled = useConfettiEnabled();

  const championId =
    championship.celebrationActive && championship.championCollegeId ? championship.championCollegeId : null;

  const handleCollegeClick = (collegeName: string) => {
    router.push(`/games?college=${encodeURIComponent(collegeName)}`);
  };

  if (seasonLoading || standings.loading || !selected) {
    return <LoadingScreen />;
  }

  return (
    <div className="rounded-lg overflow-hidden sm:max-w-5xl min-w-full mx-auto mt-10 mb-20">
      <PageHeading heading="" />
      {SHOW_BANNER && bannerOpen && (
        <div className="mt-10 mx-5 rounded-lg flex items-center justify-center gap-3 dark:bg-[#00356b] px-4 py-2 text-sm dark:text-white bg-blue-100 text-black">
          <span>{BANNER_MESSAGE}</span>
          <button
            onClick={() => setBannerOpen(false)}
            aria-label="Close banner"
            className="ml-2 dark:text-white/70 dark:hover:text-white hover:text-black text-black/70"
          >
            ✕
          </button>
        </div>
      )}
      {championId && confettiEnabled && <ChampionConfetti />}
      <Title selected={selected} onFilterChange={setPicked} />
      {selected === ALL_TIME ? (
        <div>
          <AllTimePodiums />
          <AllTimeLeaderboardTable />
        </div>
      ) : (
        <div>
          <YearlyPodiums
            colleges={standings.colleges.slice(0, 3)}
            onCollegeClick={handleCollegeClick}
            highlightCollegeId={championId}
          />
          <YearlyLeaderboardTable colleges={standings.colleges} onCollegeClick={handleCollegeClick} />
        </div>
      )}
    </div>
  );
};

export default AAHomeComponent;
