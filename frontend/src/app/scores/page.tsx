"use client";

import React, { useEffect, useState, useContext } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@src/components/LoadingScreen";
import CollegeSummaryCard from "@src/components/scores/CollegeSummaryCard";
import CollegeSummaryCardMobile from "@src/components/scores/CollegeSummaryCardMobile";
import { FiltersContext } from "@src/context/FiltersContext";
import TableHeader from "@src/components/scores/TableHeader";
import MatchesTable from "@src/components/scores/MatchTable";
import { Match, CollegeStats } from "@src/types/components";

import "react-loading-skeleton/dist/skeleton.css";

const ScoresPage: React.FC = () => {
  const filtersContext = useContext(FiltersContext);
  const { filter, setFilter } = filtersContext;
  const router = useRouter();

  // State for matches
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [originalData, setOriginalData] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for college stats
  const [collegeStats, setCollegeStats] = useState<CollegeStats | null>(null);
  const [collegeIsLoading, setCollegeIsLoading] = useState(false);

  // Fetch scores only once
  useEffect(() => {
    const fetchScores = async () => {
      try {
        const response = await fetch(
          "https://us-central1-yims-125a2.cloudfunctions.net/getMatches?type=past",
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
  const handleCollegeClick = (collegeName: string) => {
    setFilter((prev) => ({ ...prev, college: collegeName }));
  };

  return (
    <div className="min-h-screen p-8 flex-col items-center">
      <h1 className="md:text-4xl text-xl font-bold text-center mb-8 pt-8">
        Scores and Rankings
      </h1>

      {filter.college && (
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
      )}

      <div className="min-w-full flex-col items-center md:px-20">
        <TableHeader handleFilterChange={handleFilterChange} />
        <MatchesTable
          filteredMatches={filteredMatches}
          handleCollegeClick={handleCollegeClick}
        />
      </div>

      {isLoading && <LoadingScreen />}
    </div>
  );
};

export default ScoresPage;
