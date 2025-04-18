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
import Link from "next/link";
import BetTemplate from "@src/components/YOdds/BetTemplate";
import { MdClose } from "react-icons/md";
import BetSlipRow from "@src/components/YOdds/BetSlipRow";
import { SportCardProps } from "@src/types/components";
import SportCard from "@src/components/About/SportCard";
import { sports } from "@src/utils/helpers";

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

  const [newUsername, setUsername] = useState("Anonymous");
  const [viewPendingBets, setViewPendingBets] = useState(false);
  const [viewBetSlip, setViewBetSlip] = useState(false);
  const [betslip, setBetSlip] = useState<Bet[]>([]);
  const [betCount, setBetCount] = useState(0);
  const [betAmount, setBetAmount] = useState(0);

  const updateBetSlip = (bet: Bet): Bet[] => {
    const updatedBetSlip = [...betslip, bet];
    setBetSlip(updatedBetSlip);
    setBetCount(() => betCount + 1)
    return updatedBetSlip;
  };
  console.log(betslip)
  console.log(betAmount)

  const removeBet = (bet: Bet): Bet[] => {
    const updatedBetSlip = betslip.filter((b) => b.betId !== bet.betId);
    setBetSlip(updatedBetSlip);
    setBetCount(() => betCount - 1)
    return updatedBetSlip;
  }
  // console.log(pendingBets)

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
        const response = await fetch(
          `https://us-central1-yims-125a2.cloudfunctions.net/getMyAvailablePoints?email=${userEmail}`
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
        const response = await fetch(
          `https://us-central1-yims-125a2.cloudfunctions.net/getPendingBets?email=${userEmail}`
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

  // useEffect(() => {
  //   if (!pendingBets.length) return;

  //   setFilteredMatches((prevMatches) => {
  //     const filtered = prevMatches.filter((match) => {
  //       // Check if there is a prediction for the current match
  //       return !pendingBets.some((bet) => bet.matchId == match.id);
  //     });
  //     return filtered;
  //   });
  // }, [pendingBets]);

  useEffect(() => {
    const html = document.documentElement;
  
    if (viewPendingBets || viewBetSlip) {  
      html.classList.add("overflow-hidden");
    } else {
      html.classList.remove("overflow-hidden");
    }
    return () => {
      html.classList.remove("overflow-hidden");
    };
  }, [viewPendingBets, viewBetSlip]);

  const handleCollegeClick = (collegeName: string) => {
    // Implementation for betting functionality
  };

  const submitBet = async () => {
    
  }

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
    <div className={`min-h-screen p-8 md:p-0 flex-col items-center lg:w-4/5 lg:mx-auto relative`}>
      
      {/* Rankings Button */}

      <div className="pt-10 flex flex-row justify-between items-center px-4 rounded-lg pb-5">
        <div className="max-w-[75%] flex flex-col gap-y-6">
          <div className="flex flex-row gap-x-2 p-x-4 overflow-y-auto invisible-scrollbar">
            {sports.map((sport, index) => (
              <SportCard
                key={sport.id}
                sport={sport.name}
                displayName={false}
                handleClick={() => {

                }}
              />
            ))}
          </div>
          <div className="flex flex-row items-center justify-between w-full">
            <button
              className="px-3 py-2 bg-gradient-to-r from-green-400 to-blue-500 text-white font-semibold rounded-lg shadow-md hover:scale-105 transition transform duration-200 ease-in-out"
              onClick={() => {
                setViewPendingBets(!viewPendingBets);
              }}
            >
              View Pending Bets
            </button>
            <button
              className="top-0 z-50 sticky px-3 py-2 bg-gradient-to-r from-green-400 to-blue-500 text-white font-semibold rounded-lg shadow-md hover:scale-105 transition transform duration-200 ease-in-out"
              onClick={() => {
                setViewBetSlip(!viewBetSlip);
              }}
            >
              <p>View Slip {betCount}</p>
            </button>
            <button
              className="px-3 py-2 bg-gradient-to-r from-green-400 to-blue-500 text-white font-semibold rounded-lg shadow-md hover:scale-105 transition transform duration-200 ease-in-out"
              onClick={sendToRankings}
            >
              See Rankings
            </button>
          </div>
        </div>
        <div className="items-center max-h-[100%">
          <div
            className="p-6 h-[100%] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white font-bold text-xl rounded-xl shadow-lg"
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
      </div>
      
      <p className="text-xs text-center text-gray-500">
        Predictions may only be canceled 24 hours or more before the game.
      </p>

      <p className="md:text-xl font-bold text-center mb-4 pt-6">
        Upcoming Games
      </p>

      <p className="text-xs text-center text-gray-500 ">
        Predict game outcomes and see how your predictions stack against other
        Yalies! <br></br>Odds are determined by an internal algorithm and affect
        potential earnings.
        <br></br>
      </p>

      <div className="min-w-full flex-col items-center md:px-20 relative">
        {/* <BetTemplate match={filteredMatches[0]} /> */}
        <MatchesTable
          filteredMatches={filteredMatches}
          handleCollegeClick={handleCollegeClick}
          availablePoints={availablePoints}
          updateBetSlip={updateBetSlip}
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
      {viewPendingBets && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-xs w-[100%] h-[100%] flex-col"
          onClick={() => setViewPendingBets(false)}
        >
          <div 
            className="w-[60%] h-[80%] bg-custom_gray rounded-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative justify-between flex w-full rounded-t-lg p-4 flex-row border-b-2 border-black bg-custom_gray">
              <h2 className="text-xl font-semibold">Pending Bets</h2>
              <button
                onClick={() => setViewPendingBets(false)}
                className="text-gray-600 hover:text-white text-xl font-bold"
              >
                <MdClose />
              </button>
            </div>
            <div className="pl-4 pr-4 overflow-y-auto custom-scrollbar h-full]">
              {pendingLoading ? (
                <div className="flex justify-center items-center">
                  <FaSpinner className="animate-spin" />
                </div>
              ) : (
                <MatchesTablePending pendingBets={pendingBets} />
              )}
            </div>
          </div>
        </div>
      )}
      {viewBetSlip && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-xs w-[100%] h-[100%] flex-col"
          onClick={() => setViewBetSlip(false)}
        >
          <div 
            className="w-[60%] h-[80%] bg-custom_gray rounded-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative justify-between flex w-full rounded-t-lg p-4 flex-row border-b-2 border-black bg-custom_gray">
              <h2 className="text-xl font-semibold">Prediction Slip</h2>
              <button onClick={submitBet}>Submit Bet</button>
              <input onChange={(e) => setBetAmount(Number(e.target.value))}></input>
              <button
                onClick={() => setViewBetSlip(false)}
                className="text-gray-600 hover:text-white text-xl font-bold"
              >
                <MdClose />
              </button>
            </div>
            <div className="pl-4 pr-4 overflow-y-auto custom-scrollbar h-full]">
              {betslip.length === 0 ? (
                <div className="flex justify-center items-center flex-col">
                  <p className="text-gray-600">No bets in the slip</p>
                  <p className="text-gray-600">Add bets to make a parlay</p>
                </div>
              ) : (
                <div>
                  {betslip.map((bet, index) => (
                    <BetSlipRow
                      key={index}
                      bet={bet}
                      isFirst={index === 0}
                      isLast={index === betslip.length - 1}
                      removeBet={removeBet}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default YoddsPage;
