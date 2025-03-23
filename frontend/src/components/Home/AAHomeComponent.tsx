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
import AllTimeLeaderboardTable from "./AllTImeLeaderboard";
import PredictionPodiums from "./PredictionPodiums";
import PredictionLeaderboard from "./PredictionLeaderboard";

const AAHomeComponent: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false); // Track user leaderboard loading
  const [sortedColleges, setSortedColleges] = useState<any[]>([]);
  const [sortedUsers, setSortedUsers] = useState<any[]>([]);
  const { setFilter } = useContext(FiltersContext);
  const { filter } = useContext(FiltersContext);
  const [selected, setSelected] = useState<string>(filter.selected?.trim() !== "" ? filter.selected : "2024-2025");
  // const [selected, setSelected] = useState<string>("2024-2025");

  useEffect(() => {
    if (selected === "Prediction" && sortedUsers.length === 0) {
      console.debug("Fetching user leaderboard due to selected change...");
      fetchUserLeaderboard();
    }
  }, [selected]); 

  useEffect(() => {
    const fetchCollegesLeaderboard = async () => {
      try {
        const response = await fetch(
          "https://us-central1-yims-125a2.cloudfunctions.net/getLeaderboard",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

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
  }, []);

  const fetchUserLeaderboard = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch(
        "https://us-central1-yims-125a2.cloudfunctions.net/getUserLeaderboard",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Error fetching users leaderboard: ${response.statusText}`
        );
      }

      const data = await response.json();
      setSortedUsers(() => data);
    } catch (error) {
      console.error("Failed to fetch users leaderboard:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

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

    if (filter === "Prediction" && sortedUsers.length === 0) {
      // Only fetch user leaderboard if not already loaded
      fetchUserLeaderboard();
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10">
        <LoadingScreen />
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden w-full sm:max-w-5xl mx-auto">
      {/* Title */}
      <Title selected={selected} onFilterChange={handleSelectedChange} />

      {/* Conditional Rendering */}
      {selected === "2024-2025" ? (
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
      ) : selected === "Prediction" ? (
        <div className="px-5">
          {loadingUsers ? (
            <div className="text-center py-10">
              <LoadingScreen />
            </div>
          ) : (
            <>
              {console.debug("Users fed to PredictionPodiums:", sortedUsers.slice(0, 3))}
              {console.debug("Users fed to PredictionLeaderboard:", sortedUsers)}
              <PredictionPodiums users={sortedUsers.slice(0, 3)} />
              <PredictionLeaderboard users={sortedUsers} />
            </>
          )}
        </div>
      ) : (
        <div>
          <AllTimePodiums />
          <AllTimeLeaderboardTable />
        </div>
      )}
    </div>
  );
};

export default AAHomeComponent;
