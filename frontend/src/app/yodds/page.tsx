"use client";

import React, { useEffect, useState, useContext } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@src/components/LoadingScreen";
import CollegeSummaryCard from "@src/components/Scores/CollegeSummaryCard";
import CollegeSummaryCardMobile from "@src/components/Scores/CollegeSummaryCardMobile";
import { FiltersContext } from "@src/context/FiltersContext";
import TableHeader from "@src/components/Scores/TableHeader";
import MatchesTable from "@src/components/Scores/MatchTable";
//YOdds table import
import MatchesTableYO from "@src/components/YOdds/MatchTable";
//YOdds table for pending bets import
import MatchesTablePending from "@src/components/YOdds/MatchTablePending";

import { Match, CollegeStats, Bet } from "@src/types/components";

import { useUser } from "../../context/UserContext.jsx";

import "react-loading-skeleton/dist/skeleton.css";

const YoddsPage: React.FC = () => {
  {
    /* This contains a lot of stuff that could be used for filters. The actual functionality for filters isn't implemented yet. */
  }

  const filtersContext = useContext(FiltersContext);
  const { filter, setFilter } = filtersContext;
  const router = useRouter();

  // State for matches
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [originalData, setOriginalData] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingBets, setPendingBets] = useState<Bet[]>([]);
  const [availablePoints, setAvailablePoints] = useState<number | null>(null);

  // State for college stats
  const [collegeStats, setCollegeStats] = useState<CollegeStats | null>(null);
  const [collegeIsLoading, setCollegeIsLoading] = useState(false);

  const { user } = useUser(); // Now calling inside a component
  const userEmail = user ? user.email : null;

  useEffect(() => {
    if (!userEmail) return;

    const fetchMyPoints = async () => {
      try {
        const response = await fetch(
          // `https://us-central1-yims-125a2.cloudfunctions.net/getPendingBets?email=${encodeURIComponent(userEmail)}`,
          `https://us-central1-yims-125a2.cloudfunctions.net/getMyAvailablePoints?email=${userEmail}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching my points: ${response.statusText}`);
        }

        const data = await response.json();
        setAvailablePoints(data.points);
      } catch (error) {
        console.error("Failed to fetch scores:", error);
      }
    };

    fetchMyPoints();
  }, [userEmail]);

  // Fetch pending bets only once
  useEffect(() => {
    if (!userEmail) return;

    const fetchPendingBets = async () => {
      try {
        const response = await fetch(
          // `https://us-central1-yims-125a2.cloudfunctions.net/getPendingBets?email=${encodeURIComponent(userEmail)}`,
          `https://us-central1-yims-125a2.cloudfunctions.net/getPendingBets?email=${userEmail}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Error fetching pending bets: ${response.statusText}`
          );
        }

        const data = await response.json();
        setPendingBets(data);
      } catch (error) {
        console.error("Failed to fetch scores:", error);
      }
    };

    fetchPendingBets();
  }, [availablePoints]);
  // }, [userEmail]);

  // Fetch scores only once
  useEffect(() => {
    const fetchScores = async () => {
      try {
        const response = await fetch(
          "https://us-central1-yims-125a2.cloudfunctions.net/getMatches?type=future&sortOrder=asc",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching scores: ${response.statusText}`);
        }

        const data = await response.json();
        setOriginalData(data); // Cache original data
        setFilteredMatches(data); // Initialize filtered matches
      } catch (error) {
        console.error("Failed to fetch scores:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScores();
  }, []); // Empty dependency array ensures it only runs once

  // Fetch college stats when the college filter changes
  useEffect(() => {
    const fetchCollegeStats = async () => {
      if (filter.college && filter.college !== "All") {
        setCollegeIsLoading(true);
        try {
          const response = await fetch(
            `https://us-central1-yims-125a2.cloudfunctions.net/getCollege?collegeId=${filter.college}`
          );

          if (!response.ok) {
            throw new Error(
              `Error fetching college stats: ${response.statusText}`
            );
          }

          const data = await response.json();
          setCollegeStats(data); // Update college stats
        } catch (error) {
          console.error("Failed to fetch college stats:", error);
        } finally {
          setCollegeIsLoading(false);
        }
      } else {
        setCollegeStats(null); // Reset stats if "All" is selected
      }
    };

    fetchCollegeStats();
  }, [filter.college]); // Re-fetch stats only when the college filter changes

  // Apply filters locally
  useEffect(() => {
    const applyFilters = () => {
      let matches = originalData;

      if (filter.college && filter.college !== "All") {
        matches = matches.filter(
          (match: Match) =>
            match.home_college === filter.college ||
            match.away_college === filter.college
        );
      }

      setFilteredMatches(matches); // Update filtered matches
    };

    applyFilters();
  }, [filter, originalData]); // Re-run filtering when filter or data changes

  // Handle filter change
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilter((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle college click
  //IGNORE
  const handleCollegeClick = (collegeName: string) => {
    //setFilter((prev) => ({ ...prev, college: collegeName }));
  };

  return (
    <div className="min-h-screen p-8 flex-col items-center">
      <div className="flex justify-center items-center mb-4 pt-10">
        <div
          className="p-6 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white font-bold text-xl rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
          style={{ maxWidth: "250px", minWidth: "200px" }}
        >
          <p className="text-center">My YCoins:</p>
          <p className="text-center text-3xl">
            {availablePoints !== null ? availablePoints : "0"}
          </p>
        </div>
      </div>

      <p className="md:text-xl font-bold text-center mb-4 pt-6">
        Pending Predictions
      </p>

      <p className="text-sm text-center text-gray-500 mb-8">
        Predictions may only be canceled 24 hours or more before the game.
      </p>

      <div className="min-w-full flex-col items-center md:px-20">
        {
          //<TableHeader handleFilterChange={handleFilterChange} />
        }

        <MatchesTablePending
          // filteredMatches={filteredMatches}
          // handleCollegeClick={handleCollegeClick}
          pendingBets={pendingBets}
        />
      </div>

      <p className="md:text-xl font-bold text-center mb-4 pt-6">
        Upcoming Games
      </p>

      <p className="text-sm text-center text-gray-500 mb-8">
        Select an upcoming game outcome to speculate on by clicking the
        corresponding box. The predicted{" "}
        <a
          href="https://www.investopedia.com/money-line-bet-5217219#:~:text=Investopedia%20%2F%20Zoe%20Hansen-,What%20Is%20a%20Money%20Line%20Bet%3F,a%20couple%20of%20possible%20outcomes."
          className="text-blue-500 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Moneyline
        </a>{" "}
        odds are placed next to each outcome.
      </p>

      {/*filter.college && (
        <>
          <div className="hidden xs:block">
            <CollegeSummaryCard
              stats={collegeStats}
              isLoading={collegeIsLoading}
            />
          </div>
          <div className="block xs:hidden">
            <CollegeSummaryCardMobile
              stats={collegeStats}
              isLoading={collegeIsLoading}
            />
          </div>
        </>
      )*/}

      <div className="min-w-full flex-col items-center md:px-20">
        {
          //<TableHeader handleFilterChange={handleFilterChange} />
        }

        <MatchesTableYO
          filteredMatches={filteredMatches}
          handleCollegeClick={handleCollegeClick}
          availablePoints={availablePoints}
        />
      </div>

      {isLoading && <LoadingScreen />}
    </div>
  );
};

export default YoddsPage;
