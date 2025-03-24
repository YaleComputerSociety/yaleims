"use client";

import React, { useEffect, useState, useContext } from "react";
import Image from "next/image.js";
import LoadingScreen from "@src/components/LoadingScreen";
import { FiltersContext } from "@src/context/FiltersContext";
import Pagination from "@src/components/scores/Pagination";
import MatchesTable from "@src/components/YOdds/MatchTable";
import MatchesTablePending from "@src/components/YOdds/MatchTablePending";
import { Match, Bet } from "@src/types/components";
import { useUser } from "../../context/UserContext.jsx";
import "react-loading-skeleton/dist/skeleton.css";
import { FaSpinner } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { headers } from "next/headers.js";

const YoddsPage: React.FC = () => {
  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [firstVisible, setFirstVisible] = useState<string>("");
  const [lastVisible, setLastVisible] = useState<string>("");
  const [queryType, setQueryType] = useState<string>("index");
  const [totalPages, setTotalPages] = useState<number>(10);
  const [sortOrder] = useState<string>("asc"); // Fixed to ascending for future matches

  // Data state
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [coinsLoading, setCoinsLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(true);

  const [pendingBets, setPendingBets] = useState<Bet[]>([]);
  const [availablePoints, setAvailablePoints] = useState<number>(0);

  const { user, signIn } = useUser();
  const userEmail = user ? user.email : null;
  const router = useRouter();
  const { setFilter } = useContext(FiltersContext);

  const [newUsername, setUsername] = useState("Anonymous");

  // Construct URL parameters for different query types
  const getQueryParams = (type: string) => {
    const baseParams = {
      type: "index",
      pageSize: "20",
      sortOrder: "asc",
      college: "All",
      date: "future",
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

  // Fetch matches with pagination
  useEffect(() => {
    const fetchMatches = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams(getQueryParams(queryType));
        const response = await fetch(
          `https://us-central1-yims-125a2.cloudfunctions.net/getMatchesPaginated?${params}`
        );

        if (!response.ok) {
          throw new Error(`Error fetching matches: ${response.statusText}`);
        }

        const data = await response.json();
        setFilteredMatches(data.matches);
        if (data.firstVisible) setFirstVisible(data.firstVisible);
        if (data.lastVisible) setLastVisible(data.lastVisible);
        if (data.totalPages) setTotalPages(data.totalPages);
      } catch (error) {
        console.error("Failed to fetch matches:", error);
      } finally {
        setIsLoading(false);
      }
    };

    window.scrollTo(0, 0);
    fetchMatches();
  }, [page, queryType]);

  // Fetch user points
  useEffect(() => {
    if (!userEmail) return;

    const fetchMyPoints = async () => {
      setCoinsLoading(true);
      try {
        const userToken = sessionStorage.getItem("userToken");
        const response = await fetch(
          `https://us-central1-yims-125a2.cloudfunctions.net/getMyAvailablePoints?email=${userEmail}`,
          {
            headers: { Authorization: `Bearer ${userToken}` },
          }
        );
        if (!response.ok)
          throw new Error(`Error fetching points: ${response.statusText}`);
        const data = await response.json();
        setAvailablePoints(data.points);
        setUsername(data.username);
      } catch (error) {
        console.error("Failed to fetch points:", error);
      } finally {
        setCoinsLoading(false);
      }
    };

    fetchMyPoints();
  }, [userEmail]);

  // Fetch pending bets
  useEffect(() => {
    if (!userEmail) return;

    const fetchPendingBets = async () => {
      try {
        setPendingLoading(true);
        const userToken = sessionStorage.getItem("userToken");
        const response = await fetch(
          `https://us-central1-yims-125a2.cloudfunctions.net/getPendingBets?email=${userEmail}`,
          {
            headers: { Authorization: `Bearer ${userToken}` },
          }
        );
        if (!response.ok)
          throw new Error(
            `Error fetching pending bets: ${response.statusText}`
          );
        const data = await response.json();
        setPendingBets(data);
      } catch (error) {
        console.error("Failed to fetch pending bets:", error);
      } finally {
        setPendingLoading(false);
      }
    };

    fetchPendingBets();
  }, [userEmail]);

  useEffect(() => {
    if (!pendingBets.length) return;

    setFilteredMatches((prevMatches) => {
      const filtered = prevMatches.filter((match) => {
        // Check if there is a prediction for the current match
        return !pendingBets.some((bet) => bet.matchId == match.id);
      });
      return filtered;
    });
  }, [pendingBets]);

  const handleCollegeClick = (collegeName: string) => {
    // Implementation for betting functionality
  };

  const sendToRankings = () => {
    setFilter({
      college: "",
      sport: "",
      date: "",
      selected: "Prediction",
    });
    router.push("/");
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <div className="text-center h-48 mt-40 w-2/5 mx-auto">
        {" "}
        <div
          className="bg-green-500 dark:bg-green-600 shadow-md p-4 rounded-md 
          hover:shadow-lg hover:scale-105 hover:rounded-lg transition-transform duration-300 ease-in-out text-center"
          onClick={signIn}
        >
          <span className="text-white dark:text-gray-200 font-medium rounded-lg">
            Sign in with Google to view your yodds
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 md:p-0 flex-col items-center lg:w-4/5 lg:mx-auto relative">
      {/* Rankings Button */}
      <button
        className="absolute top-10 right-12 mr-8 px-5 py-2 bg-gradient-to-r from-green-400 to-blue-500 text-white font-semibold rounded-lg shadow-md hover:scale-105 transition transform duration-200 ease-in-out"
        onClick={sendToRankings}
      >
        See Rankings
      </button>

      <div className="flex justify-center items-center mb-4 pt-10">
        <div
          className="p-6 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white font-bold text-xl rounded-xl shadow-lg"
          style={{ maxWidth: "250px", minWidth: "200px" }}
        >
          <p className="text-center">
            <span className="text-yellow-300">{newUsername}</span> YCoins:
          </p>
          <div className="flex flex-row justify-center items-center gap-1">
            {coinsLoading ? (
              <FaSpinner className="animate-spin" />
            ) : (
              <p className="text-center text-3xl">
                {availablePoints !== null ? availablePoints.toFixed(2) : "0"}
              </p>
            )}
            <Image
              src="/YCoin.png"
              alt="YCoin"
              height={35}
              width={35}
              style={{ objectFit: "contain" }}
            />
          </div>
        </div>
      </div>

      <p className="md:text-xl font-bold text-center mb-4 pt-6">
        Pending Predictions
      </p>

      <p className="text-xs text-center text-gray-500">
        Predictions may only be canceled 24 hours or more before the game.
      </p>

      {pendingLoading ? (
        <div className="flex justify-center items-center mt-4">
          <FaSpinner className="animate-spin" />
        </div>
      ) : (
        <div className="min-w-full flex-col items-center md:px-20">
          <MatchesTablePending pendingBets={pendingBets} />
        </div>
      )}

      <p className="md:text-xl font-bold text-center mb-4 pt-6">
        Upcoming Games
      </p>

      <p className="text-xs text-center text-gray-500">
        Predict game outcomes and see how your predictions stack against other
        Yalies! <br></br>Odds are determined by an internal algorithm and affect
        potential earnings.
        <br></br>
      </p>

      <div className="min-w-full flex-col items-center md:px-20 relative">
        <MatchesTable
          filteredMatches={filteredMatches}
          handleCollegeClick={handleCollegeClick}
          availablePoints={availablePoints}
        />
        {filteredMatches.length > 0 && (
          <Pagination
            currentPageNumber={page}
            totalPages={totalPages}
            setPageNumber={setPage}
            setQueryType={setQueryType}
          />
        )}
      </div>
      <br></br>
    </div>

    // <div className="min-h-screen p-8 md:p-0 flex-col items-center lg:w-4/5 lg:mx-auto">

    //   {/* Rankings Button*/}
    //   <button
    //     className="md:px-25 absolute mt-10 top-8 right-15 px-4 py-2 bg-gradient-to-r from-green-400 to-blue-500 text-white font-semibold rounded-lg shadow-md hover:scale-105 transition transform duration-200 ease-in-out"
    //     onClick={sendToRankings}
    //   >
    //     See Rankings
    //   </button>

    //   <div className="flex justify-center items-center mb-4 pt-10">
    //     <div
    //       className="p-6 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white font-bold text-xl rounded-xl shadow-lg "
    //       style={{ maxWidth: "250px", minWidth: "200px" }}
    //     >
    //       <p className="text-center">
    //         <span className="text-yellow-300">{user.username}</span> YCoins:
    //       </p>
    //       <div className="flex flex-row justify-center items-center gap-1">
    //         {coinsLoading ? (
    //           <FaSpinner className="animate-spin" />
    //         ) : (
    //           <p className="text-center text-3xl">
    //             {availablePoints !== null ? availablePoints.toFixed(2) : "0"}
    //           </p>
    //         )}
    //         <Image
    //           src="/YCoin.png"
    //           alt="YCoin"
    //           height={35} // Retains the specified height
    //           width={35} // Retains the specified width
    //           style={{ objectFit: "contain" }} // Proper usage of objectFit
    //         />
    //       </div>
    //     </div>
    //   </div>

    //   <p className="md:text-xl font-bold text-center mb-4 pt-6">
    //     Pending Predictions
    //   </p>

    //   <p className="text-xs text-center text-gray-500">
    //     Predictions may only be canceled 24 hours or more before the game.
    //   </p>

    //   {pendingLoading ? (
    //     <div className="flex justify-center items-center mt-4">
    //       <FaSpinner className="animate-spin" />
    //     </div>
    //   ) : (
    //     <div className="min-w-full flex-col items-center md:px-20">
    //       <MatchesTablePending pendingBets={pendingBets} />
    //     </div>
    //   )}

    //   <p className="md:text-xl font-bold text-center mb-4 pt-6">
    //     Upcoming Games
    //   </p>

    //   <p className="text-xs text-center text-gray-500 ">
    //     Predict game outcomes and see how your predictions stack against other
    //     Yalies! <br></br>Odds are determined by an internal algorithm and affect
    //     potential earnings.
    //     <br></br>
    //   </p>

    //   <div className="min-w-full flex-col items-center md:px-20">
    //     <MatchesTable
    //       filteredMatches={filteredMatches}
    //       handleCollegeClick={handleCollegeClick}
    //       availablePoints={availablePoints}
    //     />
    //     {filteredMatches.length > 0 && (
    //       <Pagination
    //         currentPageNumber={page}
    //         totalPages={totalPages}
    //         setPageNumber={setPage}
    //         setQueryType={setQueryType}
    //       />
    //     )}
    //   </div>

    //   <br></br>
    // </div>
  );
};

export default YoddsPage;
