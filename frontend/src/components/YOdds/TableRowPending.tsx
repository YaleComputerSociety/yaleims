import { useState, useEffect } from "react";
import Image from "next/image";
import { toCollegeName, emojiMap } from "@src/utils/helpers";

import { TablePendingRowProps } from "@src/types/components";
import { useUser } from "../../context/UserContext.jsx";

//TableRow Component
const TableRowPending: React.FC<TablePendingRowProps> = ({
  bet,
  isFirst,
  isLast,
}) => {
  const getTimeString = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };
  // something
  // const [isBetDeleted, setIsBetDeleted] = useState(false);
  const [reloadNow, setReloadNow] = useState(false);
  const { user } = useUser();
  const userEmail = user ? user.email : null;

  const handleDeleteBet = async () => {
    if (!userEmail) return;

    console.log("Delete bet clicked");

    try {
      const response = await fetch(
        `https://us-central1-yims-125a2.cloudfunctions.net/deleteBet?email=${userEmail}&matchId=${bet.matchId}&sport=${bet.sport}&betAmount=${bet.betAmount}&betOdds=${bet.betOdds}&betOption=${bet.betOption}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error deleting bet: ${response.statusText}`);
      }

      const data = await response.text();
      // const data = await response.json();
      setReloadNow(true);
    } catch (error) {
      console.error("Failed to delete bet:", error);
    }
  };

  useEffect(() => {
    if (reloadNow) {
      window.location.reload();
    }
  }, [reloadNow]);

  return (
    <div
      className={`bg-white dark:bg-black grid grid-cols-[auto_1fr_auto] items-center ${
        isFirst ? "rounded-t-lg" : ""
      } 
    ${isLast ? "rounded-b-lg" : ""}`}
    >
      <div className="md:px-6 pl-2 py-4 text-xs  text-gray-500">
        {getTimeString(bet.matchTimestamp)}
      </div>

      {/* Combine Colleges and Scores into one column */}
      <div className="text-left md:px-6 py-4 px-3 text-sm grid md:grid-cols-[0.5fr_0.5fr_0.3fr_0.3fr] md:grid-rows-1 grid-rows-2 grid-flow-col gap-2 items-center">
        {/* In reality we will have an if statement to determine whether the bet is for a forfeit, team1win, team2win or draw based on the bet object but this will be implemented when we're ready to fully integrate. For now a placeholder to display what it WILL look like.*/}

        {bet.betOption == bet.home_college ? (
          // EXAMPLE: home college bet
          <>
            <div className="items-start text-xs ">
              <p className="text-black flex items-center bg-green-300 p-2 rounded-xl">
                <Image
                  src={`/college_flags/${toCollegeName[bet.home_college]}.png`}
                  alt={bet.home_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />
                {toCollegeName[bet.home_college]}
              </p>
            </div>
            <div
              className={`${
                bet.away_college === "" ? "hidden" : "block"
              } items-start text-xs `}
            >
              <p className="text-black dark:text-white flex items-center">
                <Image
                  src={`/college_flags/${toCollegeName[bet.away_college]}.png`}
                  alt={bet.away_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />

                {toCollegeName[bet.away_college]}
              </p>
            </div>

            <div className="text-center hidden md:block">
              <p>
                {bet.betAmount} -&gt; {bet.betAmount * 2} coins
              </p>
            </div>
            <div
              className="cursor-pointer text-center hidden md:block"
              onClick={handleDeleteBet} // Replace with your function
              // onClick={() => handleDeleteBet()} // Replace with your function
              style={{
                background: "#FF3333",
                border: "6px solid #FF3333",
                borderRadius: "10px",
              }}
            >
              <p>Cancel</p>
            </div>

            <div className="text-center md:hidden text-xs">
              <p>
                {bet.betAmount} -&gt; {bet.betAmount * 2} coins
              </p>
            </div>
            <div
              className="cursor-pointer text-center md:hidden text-xs"
              // onClick={() => handleDeleteBet()} // Replace with your function
              onClick={handleDeleteBet} // Replace with your function
              style={{
                background: "#FF3333",
                border: "6px solid #FF3333",
                borderRadius: "10px",
              }}
            >
              <p>Cancel</p>
            </div>
          </>
        ) : bet.betOption == bet.away_college ? (
          // EXAMPLE: away college bet
          <>
            <div className="items-start text-xs ">
              <p className="text-black dark:text-white flex items-center">
                <Image
                  src={`/college_flags/${toCollegeName[bet.home_college]}.png`}
                  alt={bet.home_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />
                {toCollegeName[bet.home_college]}
              </p>
            </div>
            <div
              className={`${
                bet.away_college === "" ? "hidden" : "block"
              } items-start text-xs `}
            >
              <p className="text-black flex items-center bg-green-300 p-2 rounded-xl">
                <Image
                  src={`/college_flags/${toCollegeName[bet.away_college]}.png`}
                  alt={bet.away_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />

                {toCollegeName[bet.away_college]}
              </p>
            </div>

            <div className="text-center hidden md:block">
              <p>
                {bet.betAmount} -&gt; {bet.betAmount * 2} coins
              </p>
            </div>
            <div
              className="cursor-pointer text-center hidden md:block"
              onClick={handleDeleteBet} // Replace with your function
              // onClick={() => handleDeleteBet()} // Replace with your function
              style={{
                background: "#FF3333",
                border: "6px solid #FF3333",
                borderRadius: "10px",
              }}
            >
              <p>Cancel</p>
            </div>

            <div className="text-center md:hidden text-xs">
              <p>
                {bet.betAmount} -&gt; {bet.betAmount * 2} coins
              </p>
            </div>
            <div
              className="cursor-pointer text-center md:hidden text-xs"
              onClick={handleDeleteBet} // Replace with your function
              // onClick={() => handleDeleteBet()} // Replace with your function
              style={{
                background: "#FF3333",
                border: "6px solid #FF3333",
                borderRadius: "10px",
              }}
            >
              <p>Cancel</p>
            </div>
          </>
        ) : bet.betOption == "Draw" ? (
          // EXAMPLE: draw
          <>
            <div className="items-start text-xs ">
              <p className="text-black flex items-center bg-blue-300 p-2 rounded-xl">
                <Image
                  src={`/college_flags/${toCollegeName[bet.home_college]}.png`}
                  alt={bet.home_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />
                {toCollegeName[bet.home_college]}
              </p>
            </div>
            <div
              className={`${
                bet.away_college === "" ? "hidden" : "block"
              } items-start text-xs `}
            >
              <p className="text-black flex items-center bg-blue-300 p-2 rounded-xl">
                <Image
                  src={`/college_flags/${toCollegeName[bet.away_college]}.png`}
                  alt={bet.away_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />

                {toCollegeName[bet.away_college]}
              </p>
            </div>
            <div className="text-center hidden md:block">
              <p>
                {bet.betAmount} -&gt; {bet.betAmount * 2} coins
              </p>
            </div>
            <div
              className="cursor-pointer text-center hidden md:block"
              onClick={handleDeleteBet} // Replace with your function
              // onClick={() => handleDeleteBet()} // Replace with your function
              style={{
                background: "#FF3333",
                border: "6px solid #FF3333",
                borderRadius: "10px",
              }}
            >
              <p>Cancel</p>
            </div>

            <div className="text-center md:hidden text-xs">
              <p>
                {bet.betAmount} -&gt; {bet.betAmount * 2} coins
              </p>
            </div>
            <div
              className="cursor-pointer text-center md:hidden text-xs"
              onClick={handleDeleteBet} // Replace with your function
              // onClick={() => handleDeleteBet()} // Replace with your function
              style={{
                background: "#FF3333",
                border: "6px solid #FF3333",
                borderRadius: "10px",
              }}
            >
              <p>Cancel</p>
            </div>
          </>
        ) : (
          // EXAMPLE: forfeit
          <>
            <div className="items-start text-xs ">
              <p className="text-black flex items-center bg-gray-300 p-2 rounded-xl">
                <Image
                  src={`/college_flags/${toCollegeName[bet.home_college]}.png`}
                  alt={bet.home_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />
                {toCollegeName[bet.home_college]}
              </p>
            </div>
            <div
              className={`${
                bet.away_college === "" ? "hidden" : "block"
              } items-start text-xs `}
            >
              <p className="text-black flex items-center bg-gray-300 p-2 rounded-xl">
                <Image
                  src={`/college_flags/${toCollegeName[bet.away_college]}.png`}
                  alt={bet.away_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />

                {toCollegeName[bet.away_college]}
              </p>
            </div>

            <div className="text-center hidden md:block">
              <p>
                {bet.betAmount} -&gt; {bet.betAmount * 2} coins
              </p>
            </div>
            <div
              className="cursor-pointer text-center hidden md:block"
              onClick={handleDeleteBet} // Replace with your function
              // onClick={() => handleDeleteBet()} // Replace with your function
              style={{
                background: "#FF3333",
                border: "6px solid #FF3333",
                borderRadius: "10px",
              }}
            >
              <p>Cancel</p>
            </div>

            <div className="text-center md:hidden text-xs">
              <p>
                {bet.betAmount} -&gt; {bet.betAmount * 2} coins
              </p>
            </div>
            <div
              className="cursor-pointer text-center md:hidden text-xs"
              onClick={handleDeleteBet} // Replace with your function
              // onClick={() => handleDeleteBet()} // Replace with your function
              style={{
                background: "#FF3333",
                border: "6px solid #FF3333",
                borderRadius: "10px",
              }}
            >
              <p>Cancel</p>
            </div>
          </>
        )}
      </div>

      <div className="text-center px-2 py-1">{emojiMap[bet.sport]}</div>
    </div>
  );
};

export default TableRowPending;
