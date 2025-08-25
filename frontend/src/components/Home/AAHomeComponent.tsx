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
import PopUp from "@src/components/PopUp";

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

  function NewInfo() {
    return (
      <div className="p-2">
        <h2 className=" text-amber-500 underline underline-offset-8">Leaderboard</h2>
        <p className="mt-2">
          Can view the leaderboard by year or all time now!
          Previous years would be uploaded soon.
        </p>
        <h2 className=" text-emerald-500 underline underline-offset-8">Role System</h2>
        <p className="mt-2">
          There are four roles: Admin, College Rep, Captain and User. 
          Admins can do everything, College Reps can manage their college&apos;s roster and captains, 
          Captains can manage their team&apos;s roster, and Users can only view information. 
          There are more specific things each role can do but this is the general overview.
          If you want to be a College Rep or Admin please contact ephraim.akai-nettey@yale.edu
        </p>
        <h2 className="text-fuchsia-500 underline underline-offset-8">Parlays!</h2>
        <p className="mt-2">
          Parlays are now live! You can create a parlay by going to the odds page.
        </p>
        <h2 className="text-sky-500 underline underline-offset-8">APIs</h2>
        <p className="mt-2">
          Visit the Api Page to see the new APIs available for use!
        </p>

      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden sm:max-w-5xl min-w-full mx-auto mt-10 mb-20">
      <PageHeading heading="" />
      <div className="fixed md:top-3 top-2 left-44  md:left-auto pl-3 z-50 ">
        <PopUp title="What's New?" CustomComponent={NewInfo}/>
      </div>
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
