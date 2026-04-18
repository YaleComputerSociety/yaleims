"use client";

import React, { useEffect, useState, useContext } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "../LoadingScreen";
import { FiltersContext } from "@src/context/FiltersContext";
import { currentYear, colleges } from "@src/utils/helpers";
import Title from "./Title";
import YearlyLeaderboardTable from "./YearlyLeaderboardTable";
import { YearlyPodiums } from "./YearlyPodiums";
import AllTimePodiums from "./AllTimePodiums";
import AllTimeLeaderboardTable from "./AllTimeLeaderboard";
import { useSeason } from "@src/context/SeasonContext";
import PageHeading from "../PageHeading";
import ChampionConfetti from "./ChampionConfetti";
import { useConfettiEnabled } from "@src/utils/preferences";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";

const SHOW_BANNER = false;
const BANNER_MESSAGE =
  "🎮 The odds challenge for the Nintendo Switch is still on! Place bets to compete!";

const AAHomeComponent: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [sortedColleges, setSortedColleges] = useState<any[]>([]);
  const { filter } = useContext(FiltersContext);
  const { currentSeason } = useSeason();
  const [selected, setSelected] = useState<string>(
    filter.selected?.trim() !== ""
      ? filter.selected
      : currentSeason?.year || currentYear,
  );
  const [bannerOpen, setBannerOpen] = useState(true);
  const [championship, setChampionship] = useState<{
    winningCollegeId: string | null;
    celebrationActive: boolean;
  } | null>(null);
  const confettiEnabled = useConfettiEnabled();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "seasons", "current"), (snap) => {
      const data = snap.data() as
        | { winningCollegeId?: string | null; celebrationActive?: boolean }
        | undefined;
      setChampionship({
        winningCollegeId: data?.winningCollegeId ?? null,
        celebrationActive: !!data?.celebrationActive,
      });
    });
    return () => unsub();
  }, []);

  const winningCollege =
    championship?.celebrationActive && championship.winningCollegeId
      ? colleges.find((c) => c.id === championship.winningCollegeId)
      : undefined;

  useEffect(() => {
    let unsub: Unsubscribe | undefined;
    if (!selected || selected === "All Time") return;

    setLoading(true);

    const q = query(
      collection(db, "colleges", "seasons", selected),
      orderBy("rank", "asc"),
    );

    unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        rows.sort((a, b) => Number(a.rank) - Number(b.rank));
        setSortedColleges(rows);
        setLoading(false);
      },
      (err) => {
        console.error("Leaderboard listener error:", err);
        setLoading(false);
      },
    );

    return () => unsub?.();
  }, [selected]);

  const handleCollegeClick = (collegeName: string) => {
    router.push(`/games?college=${encodeURIComponent(collegeName)}`);
  };

  const handleSelectedChange = (filter: string) => {
    setSelected(filter);
  };

  if (loading) {
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
      {winningCollege && confettiEnabled && <ChampionConfetti />}
      <Title
        selected={selected}
        lastUpdated={sortedColleges[0].today}
        onFilterChange={handleSelectedChange}
      />
      {selected === "All Time" ? (
        <div>
          <AllTimePodiums />
          <AllTimeLeaderboardTable />
        </div>
      ) : (
        <div>
          <YearlyPodiums
            colleges={sortedColleges.slice(0, 3)}
            onCollegeClick={handleCollegeClick}
            highlightCollegeId={winningCollege?.id ?? null}
          />
          <YearlyLeaderboardTable
            colleges={sortedColleges}
            onCollegeClick={handleCollegeClick}
          />
        </div>
      )}
    </div>
  );
};

export default AAHomeComponent;
