import { useUser } from "@src/context/UserContext";
import React, { useEffect, useState } from "react";
import { useSeason } from "@src/context/SeasonContext";
import Pagination from "@src/components/Scores/Pagination";
import { toCollegeAbbreviation, toCollegeName } from "@src/utils/helpers";
import LoadingSpinner from "@src/components/LoadingSpinner";

const ViewTeamSignups = () => {
    const { user } = useUser();
    const { currentSeason } = useSeason()
    const [captainSports, setCaptainSports] = useState<string[]>([]);
    const [selectedSport, setSelectedSport] = useState<string>("")
    const [sportsLoading, setSportsLoading] = useState<boolean>(true);

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

    const fetchSports = async () => {
        try {
            const response = await fetch(`/api/functions/getCaptainSports?email=${user?.email}`)
            if (!response.ok) return new Error("Error fetching captain sports")
            const data = await response.json()
            setCaptainSports(data)
            setSelectedSport(data[0])
        } catch(error) {
            console.error(error)
        } finally {
            setSportsLoading(false)
        }
    }
  
    useEffect(() => {
        fetchSports()
    }, [])

    const getQueryParams = (type: string) => {
      const baseParams = {
        type: "index",
        pageSize: "10",
        sortOrder: "asc",
        college: user ? toCollegeAbbreviation[user.college] : "All",
        date: "future",
        sport: selectedSport,
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

    useEffect(() => {
      const fetchMatches = async () => {
        setSportsLoading(true);
        try {
          const params = new URLSearchParams(getQueryParams(queryType));
          const response = await fetch(`/api/functions/getMatches?${params}&seasonId=${currentSeason?.year || "2025-2026"}`);
          if (!response.ok) throw new Error(`Error fetching matches: ${response.statusText}`);
  
          const data = await response.json();
          setFilteredMatches(data.matches);
          
          
          if (data.firstVisible) setFirstVisible(data.firstVisible);
          if (data.lastVisible) setLastVisible(data.lastVisible);
          if (data.totalPages) setTotalPages(data.totalPages);
          
        } catch (error) {
          console.error("Failed to fetch matches:", error);
        } finally {
          setSportsLoading(false);
        }
      };
  
      // window.scrollTo(0, 0);
      fetchMatches();
    }, [page, queryType, selectedSport]);

    const fmtDate = (ts?: string | null) =>
      ts ? new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "TBD";

    if (sportsLoading) {
      return <LoadingSpinner />
    }

    return (
      <div className="grid grid-rows-10 h-full">
        <div className="row-span-1 gap-x-3 flex flex-row items-center"> 
          {captainSports.map((sport) => 
            <h3 
              key={sport}
              onClick={() => setSelectedSport(sport)}
              className={`cursor-pointer px-2 py-2
                  ${sport === selectedSport
                  ? "border-b-2 border-black font-semibold"
                  : "text-gray-600 hover:text-black"}`}            
            >           
              {sport}
            </h3>
            
          )}
        </div>
        <div className="row-span-8 overflow-auto">
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
                      {(toCollegeName[m.home_college] ?? "TBD")} vs {(toCollegeName[m.away_college] ?? "TBD")}
                    </p>
                    <span className="text-xs text-gray-500">{m.sport} • {m.type ?? "Match"}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {fmtDate(m.timestamp)} • {m.location ?? "Location TBD"}
                    {m.location_extra ? ` — ${m.location_extra}` : ""}
                  </p>
                </button>

                {/* Expanded participants */}
                {openId === m.id && (
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-semibold">Home ({toCollegeName[m.home_college] ?? "TBD"})</h4>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {toList(m.home_college_participants).length > 0
                          ? toList(m.home_college_participants).map((p: any, i: number) => (
                              <span key={i} className="rounded-full bg-gray-100 px-2 py-1 text-xs">
                                {label(p)}
                              </span>
                            ))
                          : <span className="text-gray-500 text-xs">No participants yet</span>}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold">Away ({toCollegeName[m.away_college] ?? "TBD"})</h4>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {toList(m.away_college_participants).length > 0
                          ? toList(m.away_college_participants).map((p: any, i: number) => (
                              <span key={i} className="rounded-full bg-gray-100 px-2 py-1 dark:text-black text-xs">
                                {label(p)}
                              </span>
                            ))
                          : <span className="text-gray-500 text-xs">No participants yet</span>}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="row-span-1">
          {filteredMatches.length > 0 && (
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
