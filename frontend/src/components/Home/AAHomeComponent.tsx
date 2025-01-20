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
  const [sortedColleges, setSortedColleges] = useState<any[]>([]);
  const [sortedUsers, setSortedUsers] = useState<any[]>([]);
  const { setFilter } = useContext(FiltersContext);
  const [selected, setSelected] = useState<string>("2024-2025");

  useEffect(() => {
    const fetchLeaderboard = async () => {
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
          throw new Error(`Error fetching leaderboard: ${response.statusText}`);
        }

        const data = await response.json();
        const sorted = data.sort((a: any, b: any) => b.points - a.points);
        setSortedColleges(() => sorted);
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  useEffect(() => {
    const fetchUserLeaderboard = async () => {
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
          throw new Error(`Error fetching leaderboard: ${response.statusText}`);
        }

        const data = await response.json();
        setSortedUsers(() => data); // Directly set the leaderboard data
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserLeaderboard();
  }, []);

  const handleCollegeClick = (collegeName: string) => {
    setFilter({
      college: toCollegeAbbreviation[collegeName],
      sport: "",
      date: "",
    });
    router.push("/scores");
  };

  if (loading) {
    return (
      <div className="text-center py-10">
        <LoadingScreen />
      </div>
    );
  }

  const handleSelectedChange = (filter: string) => {
    setSelected(filter);
  };

  console.log(sortedUsers);

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
          <PredictionPodiums users={sortedUsers.slice(0, 3)} />
          <PredictionLeaderboard
            users={sortedUsers} // Slice to show 10 additional entries
          />
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
