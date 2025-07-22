"use client";

import React, { useEffect, useState, useContext } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "../LoadingScreen";
import { FiltersContext } from "@src/context/FiltersContext";
import { toCollegeAbbreviation } from "@src/utils/helpers";
import Title from "./Title";
import YearlyLeaderboardTable from "./YearlyLeaderboardTable";
import { YearlyPodiums } from "./YearlyPodiums";
import AllTimePodiums from "./AllTimePodiums";
import AllTimeLeaderboardTable from "./AllTimeLeaderboard";
import { useSeason } from "@src/context/SeasonContext";

const AAHomeComponent: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [sortedColleges, setSortedColleges] = useState<any[]>([]);
  const { setFilter } = useContext(FiltersContext);
  const { filter } = useContext(FiltersContext);
  const { currentSeason } = useSeason();
  const [selected, setSelected] = useState<string>(filter.selected?.trim() !== "" ? filter.selected : currentSeason?.year || "2025-2026");

  useEffect(() => {
    const fetchCollegesLeaderboard = async () => {
      try {
        setLoading(true);
        if (selected === "All Time") return;
        const response = await fetch(`api/functions/getLeaderboardv2?seasonId=${selected}`)
        if (!response.ok) {
          throw new Error(
            `Error fetching colleges leaderboard: ${response.statusText}`
          );
        }

        const data = await response.json();
        const sorted = data.sort((a: any, b: any) => b.points - a.points);
        setSortedColleges(() => sorted);
      } catch (error) {
        console.error("Failed to fetch colleges leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollegesLeaderboard();
  }, [selected]);

  const handleCollegeClick = (collegeName: string) => {
    setFilter({
      college: toCollegeAbbreviation[collegeName],
      sport: "",
      date: "",
      selected: "",
    });
    router.push("/scores");
  };

  const handleSelectedChange = (filter: string) => {
    setSelected(filter);
  };

  if (loading) {
    return (
      <LoadingScreen />
    );
  }

  return (
    <div className="rounded-lg overflow-hidden w-full sm:max-w-5xl mx-auto mt-10 mb-20">
      <Title selected={selected} lastUpdated={sortedColleges[0].today} onFilterChange={handleSelectedChange} />
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
