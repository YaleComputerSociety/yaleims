"use client";

import React, { useEffect, useState, useContext } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "../LoadingScreen";
import { FiltersContext } from "@src/context/FiltersContext";
import { currentYear, toCollegeAbbreviation } from "@src/utils/helpers";
import Title from "./Title";
import YearlyLeaderboardTable from "./YearlyLeaderboardTable";
import { YearlyPodiums } from "./YearlyPodiums";
import AllTimePodiums from "./AllTimePodiums";
import AllTimeLeaderboardTable from "./AllTimeLeaderboard";
import { useSeason } from "@src/context/SeasonContext";
import PageHeading from "../PageHeading";
import { collection, onSnapshot, orderBy, query, Unsubscribe } from "firebase/firestore";
import { db } from "../../../lib/firebase";

const AAHomeComponent: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [sortedColleges, setSortedColleges] = useState<any[]>([]);
  const { setFilter } = useContext(FiltersContext);
  const { filter } = useContext(FiltersContext);
  const { currentSeason } = useSeason();
  const [selected, setSelected] = useState<string>(
    filter.selected?.trim() !== ""
      ? filter.selected
      : currentSeason?.year || currentYear
  );

  useEffect(() => {
    let unsub: Unsubscribe | undefined;
    if (!selected || selected === "All Time") return

    setLoading(true);

    const q = query(
      collection(db, "colleges", "seasons", selected),
      orderBy("rank", "asc")
    );

    unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        rows.sort((a, b) => Number(a.rank) - Number(b.rank));
        setSortedColleges(rows);
        setLoading(false);
      },
      (err) => {
        console.error("Leaderboard listener error:", err);
        setLoading(false);
      }
    );

    return () => unsub?.();
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
    return <LoadingScreen />;
  }

  return (
    <div className="rounded-lg overflow-hidden sm:max-w-5xl min-w-full mx-auto mt-10 mb-20">
      <PageHeading heading="" />
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
