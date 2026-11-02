import React, { useEffect, useState } from "react";
import { useSeason } from "@/context/SeasonContext";
import { useSession } from "@/context/SessionContext";
import Pagination from "@/components/ui/Pagination";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { fetchSeasonMatches, type Match } from "@/lib/api/matches";
import { fetchRoster, type PublicRosterEntry } from "@/lib/api/roster";
import { collegeName } from "@/lib/colleges";

const PAGE_SIZE = 10;

/** A captain's teams: each sport's upcoming games for their college, and who signed up. */
const ViewTeamSignups = () => {
  const { viewer } = useSession();
  const { currentSeason } = useSeason();
  const seasonId = currentSeason?.id ?? "";

  // The sports they captain this season, in display order; the first until one is picked.
  const captainSports = (currentSeason?.sports ?? []).filter((sport) => viewer?.captainOf.includes(sport.id));
  const [pickedSport, setSelectedSport] = useState<string | null>(null);
  const selectedSport = pickedSport ?? captainSports[0]?.id ?? "";
  const sportName = (sportId: string) => captainSports.find((s) => s.id === sportId)?.name ?? "";

  const [matchesLoading, setMatchesLoading] = useState<boolean>(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(10);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  // The open game's roster.
  const [roster, setRoster] = useState<PublicRosterEntry[]>([]);

  const toggleOpen = async (match: Match) => {
    if (openId === match.id) {
      setOpenId(null);
      return;
    }
    setRoster([]);
    setOpenId(match.id);
    try {
      setRoster((await fetchRoster(match.seasonId, match.id)).items);
    } catch (error) {
      console.error("Failed to fetch the roster:", error);
    }
  };

  useEffect(() => {
    if (!seasonId || !selectedSport || !viewer?.collegeId) return;
    let live = true;
    setMatchesLoading(true);
    setMatchesError(null);
    fetchSeasonMatches(seasonId, {
      collegeId: viewer.collegeId,
      sportId: selectedSport,
      status: "scheduled",
      from: new Date().toISOString(),
      page,
      pageSize: PAGE_SIZE,
    })
      .then(
        ({ items, total }) => {
          if (!live) return;
          setFilteredMatches(items);
          if (total) setTotalPages(Math.ceil(total / PAGE_SIZE));
        },
        (error) => {
          console.error("Failed to fetch matches:", error);
          if (live) setMatchesError("Couldn’t load matches. Try again.");
        }
      )
      .finally(() => live && setMatchesLoading(false));
    return () => {
      live = false;
    };
  }, [page, selectedSport, seasonId, viewer?.collegeId]);

  // reset pagination when sport changes
  useEffect(() => {
    setPage(1);
  }, [selectedSport]);

  const fmtDate = (ts: string) =>
    new Date(ts).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const sideNames = (collegeId: string | null) => roster.filter((e) => e.collegeId === collegeId).map((e) => e.name);

  // Loading gates
  if (matchesLoading || !currentSeason) return <div className="h-full w-full justify-center items-center flex"><LoadingSpinner /></div>

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
            key={sport.id}
            onClick={() => setSelectedSport(sport.id)}
            className={`cursor-pointer px-2 py-2 ${
              sport.id === selectedSport
                ? "border-b-2 border-black font-semibold"
                : "text-gray-600 hover:text-black"
            }`}
          >
            {sport.name}
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
            No upcoming games for {sportName(selectedSport)}.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredMatches.map((m) => (
              <li key={m.id} className="p-3">
                <button
                  onClick={() => toggleOpen(m)}
                  aria-expanded={openId === m.id}
                  className="w-full text-left"
                >
                  <div className="flex items-baseline justify-between">
                    <p className="font-medium truncate">
                      {collegeName(m.homeCollegeId) ?? "TBD"} vs{" "}
                      {collegeName(m.awayCollegeId) ?? "TBD"}
                    </p>
                    <span className="text-xs text-gray-500">
                      {sportName(m.sportId)} • {m.stage === "regular" ? "Regular" : (m.round ?? "Playoff")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {fmtDate(m.startsAt)} • {m.venue ?? "Location TBD"}
                    {m.venueDetail ? ` — ${m.venueDetail}` : ""}
                  </p>
                </button>

                {openId === m.id && (
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-semibold">
                        Home ({collegeName(m.homeCollegeId) ?? "TBD"})
                      </h4>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {sideNames(m.homeCollegeId).length > 0 ? (
                          sideNames(m.homeCollegeId).map(
                            (name, i) => (
                              <span
                                key={i}
                                className="rounded-full bg-gray-100 px-2 py-1 text-xs"
                              >
                                {name}
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
                        Away ({collegeName(m.awayCollegeId) ?? "TBD"})
                      </h4>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {sideNames(m.awayCollegeId).length > 0 ? (
                          sideNames(m.awayCollegeId).map(
                            (name, i) => (
                              <span
                                key={i}
                                className="rounded-full bg-gray-100 px-2 py-1 dark:text-black text-xs"
                              >
                                {name}
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
          />
        )}
      </div>
    </div>
  );
};

export default ViewTeamSignups;
