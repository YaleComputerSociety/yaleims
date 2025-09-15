import { useUser } from "@src/context/UserContext";
import React, { useEffect, useMemo, useState } from "react";
import { useSeason } from "@src/context/SeasonContext";
import Pagination from "@src/components/Scores/Pagination";
import { toCollegeAbbreviation, toCollegeName } from "@src/utils/helpers";
import LoadingSpinner from "@src/components/LoadingSpinner";

const ViewTeamSignups = () => {
  const { user } = useUser();
  const { currentSeason } = useSeason();

  const [captainSports, setCaptainSports] = useState<string[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>("");

  const [sportsLoading, setSportsLoading] = useState<boolean>(true);
  const [matchesLoading, setMatchesLoading] = useState<boolean>(false);

  const [sportsError, setSportsError] = useState<string | null>(null);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const [firstVisible, setFirstVisible] = useState<string>("");
  const [lastVisible, setLastVisible] = useState<string>("");
  const [queryType, setQueryType] = useState<string>("index");
  const [totalPages, setTotalPages] = useState<number>(10);
  const [filteredMatches, setFilteredMatches] = useState<any[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const toggleOpen = (id: number) => setOpenId(prev => (prev === id ? null : id));

  const toList = (x: any) => (Array.isArray(x) ? x : []);
  const label = (p: any) =>
    typeof p === "string" ? p : p?.name ?? p?.email ?? p?.uid ?? JSON.stringify(p);

  const seasonId = currentSeason?.year ?? ""; // gate on this being truthy

  const fetchSports = async () => {
    // Need a user email to look up captain sports
    if (!user?.email) {
      setSportsError("Missing user email.");
      setSportsLoading(false);
      return;
    }
    setSportsLoading(true);
    setSportsError(null);
    try {
      const response = await fetch(`/api/functions/getCaptainSports?email=${user.email}`);
      if (!response.ok) throw new Error("Error fetching captain sports");
      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      setCaptainSports(list);
      if (list.length > 0) setSelectedSport(list[0]);
    } catch (error) {
      console.error(error);
      setSportsError("Couldn’t load your captain sports.");
    } finally {
      setSportsLoading(false);
    }
  };

  useEffect(() => {
    fetchSports();
    // re-run if the user context changes
  }, [user?.email]);

  const getQueryParams = (type: string) => {
    const baseParams = {
      type: "index",
      pageSize: "10",
      sortOrder: "asc",
      college: user ? toCollegeAbbreviation[user.college] : "All",
      date: new Date().toISOString(),
      sport: selectedSport || "", // safe default
    };

    if (type === "next" && lastVisible) {
      return { ...baseParams, type, lastVisible };
    }
    if (type === "prev" && firstVisible) {
      return { ...baseParams, type, firstVisible };
    }
    if (type === "index") {
      return { ...baseParams, pageIndex: page.toString() };
    }
    return baseParams;
  };

  // Only fetch matches when BOTH seasonId and selectedSport are ready,
  // and after captainSports finished loading.
  useEffect(() => {
    const ready =
      !!seasonId && !!selectedSport && !sportsLoading && !sportsError;

    if (!ready) return;

    const fetchMatches = async () => {
      setMatchesLoading(true);
      setMatchesError(null);
      try {
        const params = new URLSearchParams(getQueryParams(queryType));
        const response = await fetch(
          `/api/functions/getMatches?${params}&seasonId=${seasonId}`
        );
        if (!response.ok)
          throw new Error(`Error fetching matches: ${response.statusText}`);

        const data = await response.json();
        setFilteredMatches(Array.isArray(data.matches) ? data.matches : []);
        if (data.firstVisible) setFirstVisible(data.firstVisible);
        if (data.lastVisible) setLastVisible(data.lastVisible);
        if (data.totalPages) setTotalPages(data.totalPages);
      } catch (error) {
        console.error("Failed to fetch matches:", error);
        setMatchesError("Couldn’t load matches. Try again.");
      } finally {
        setMatchesLoading(false);
      }
    };

    fetchMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, queryType, selectedSport, seasonId, sportsLoading, sportsError]);

  // reset pagination when sport changes
  useEffect(() => {
    setPage(1);
    setQueryType("index");
    setFirstVisible("");
    setLastVisible("");
  }, [selectedSport]);

  const fmtDate = (ts?: string | null) =>
    ts
      ? new Date(ts).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "TBD";

  // Loading gates
  if (matchesLoading || sportsLoading) return <div className="h-full w-full justify-center items-center flex"><LoadingSpinner /></div>

  if (sportsError) {
    return (
      <div className="text-sm text-red-600 dark:text-red-400">
        {sportsError}
      </div>
    );
  }

  if (captainSports.length === 0) {
    return (
      <div className="text-sm text-gray-600 dark:text-gray-300">
        No captain sports found for your account.
      </div>
    );
  }

  return (
    <div className="grid grid-rows-10 h-full w-full">
      <div className="row-span-1 gap-x-3 flex flex-row items-center">
        {captainSports.map((sport) => (
          <h3
            key={sport}
            onClick={() => setSelectedSport(sport)}
            className={`cursor-pointer px-2 py-2 ${
              sport === selectedSport
                ? "border-b-2 border-black font-semibold"
                : "text-gray-600 hover:text-black"
            }`}
          >
            {sport}
          </h3>
        ))}
      </div>

      <div className="row-span-8 overflow-auto">
        {matchesError ? (
          <div className="p-3 text-sm text-red-600 dark:text-red-400">
            {matchesError}
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="p-3 text-sm text-gray-600 dark:text-gray-300">
            No upcoming games for {selectedSport}.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredMatches.map((m: any) => (
              <li key={m.id} className="p-3">
                <button
                  onClick={() => toggleOpen(m.id)}
                  aria-expanded={openId === m.id}
                  className="w-full text-left"
                >
                  <div className="flex items-baseline justify-between">
                    <p className="font-medium truncate">
                      {(toCollegeName[m.home_college] ?? "TBD")} vs{" "}
                      {(toCollegeName[m.away_college] ?? "TBD")}
                    </p>
                    <span className="text-xs text-gray-500">
                      {m.sport} • {m.type ?? "Match"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {fmtDate(m.timestamp)} • {m.location ?? "Location TBD"}
                    {m.location_extra ? ` — ${m.location_extra}` : ""}
                  </p>
                </button>

                {openId === m.id && (
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-semibold">
                        Home ({toCollegeName[m.home_college] ?? "TBD"})
                      </h4>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {toList(m.home_college_participants).length > 0 ? (
                          toList(m.home_college_participants).map(
                            (p: any, i: number) => (
                              <span
                                key={i}
                                className="rounded-full bg-gray-100 px-2 py-1 text-xs"
                              >
                                {label(p)}
                              </span>
                            )
                          )
                        ) : (
                          <span className="text-gray-500 text-xs">
                            No participants yet
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold">
                        Away ({toCollegeName[m.away_college] ?? "TBD"})
                      </h4>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {toList(m.away_college_participants).length > 0 ? (
                          toList(m.away_college_participants).map(
                            (p: any, i: number) => (
                              <span
                                key={i}
                                className="rounded-full bg-gray-100 px-2 py-1 dark:text-black text-xs"
                              >
                                {label(p)}
                              </span>
                            )
                          )
                        ) : (
                          <span className="text-gray-500 text-xs">
                            No participants yet
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="row-span-1">
        {filteredMatches.length > 0 && !matchesError && (
          <Pagination
            currentPageNumber={page}
            totalPages={totalPages}
            setPageNumber={setPage}
            setQueryType={setQueryType}
          />
        )}
      </div>
    </div>
  );
};

export default ViewTeamSignups;
