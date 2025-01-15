import { useState, useEffect } from "react";
import Image from "next/image";
import { toCollegeName, sportsMap, emojiMap } from "@src/utils/helpers";

import { TableRowProps, Match } from "@src/types/components";
import { useUser } from "../../context/UserContext.jsx";

//TableRow Component
const TableRow: React.FC<TableRowProps> = ({ bet }) => {
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
      console.log("Deleted successfully:", data.message);
    } catch (error) {
      console.error("Failed to delete bet:", error);
    }
  };

  {
    /*
  useEffect(() => {
    if (!userEmail) return;

    const deleteBet = async () => {
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

        const data = await response.json();
        setReloadNow(true);
        console.log("Deleted successfully:", data.message);
      } catch (error) {
        console.error("Failed to delete bet:", error);
      }
    };

    deleteBet();
  }, [isBetDeleted]);

  const handleDeleteBet = () => {
    console.log('Delete bet clicked');
    setIsBetDeleted(true);
  }
*/
  }

  useEffect(() => {
    if (reloadNow) {
      window.location.reload();
    }
  }, [reloadNow]);

  return (
    <div className="bg-white grid grid-cols-[auto_1fr_auto] items-center">
      <div className="md:px-6 pl-2 py-4 text-xs md:text-sm text-gray-500">
        {new Date(bet.timestamp).toLocaleString("en-US", {
          hour: "2-digit", // "04"
          minute: "2-digit", // "00"
          hour12: true, // "AM/PM"
        })}
      </div>

      {/* Combine Colleges and Scores into one column */}
      <div className="text-left md:px-6 py-4 px-3 text-sm grid md:grid-cols-[0.5fr_0.5fr_0.3fr_0.3fr] md:grid-rows-1 grid-rows-2 grid-flow-col gap-2 items-center">
        {/* In reality we will have an if statement to determine whether the bet is for a forfeit, team1win, team2win or draw based on the bet object but this will be implemented when we're ready to fully integrate. For now a placeholder to display what it WILL look like.*/}

        {bet.betOption == bet.home_college ? (
          // EXAMPLE: home college bet
          <>
            <div className="items-start text-xs md:text-sm">
              <strong
                className="text-black flex items-center"
                style={{
                  background: "#D7FFEA",
                  border: "6px solid #D7FFEA",
                  borderRadius: "10px",
                }}
              >
                <Image
                  src={`/college_flags/${toCollegeName[bet.home_college]}.png`}
                  alt={bet.home_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />
                {toCollegeName[bet.home_college]}
              </strong>
            </div>
            <div
              className={`${
                bet.away_college === "" ? "hidden" : "block"
              } items-start text-xs md:text-sm`}
            >
              <strong className="text-black flex items-center">
                <Image
                  src={`/college_flags/${toCollegeName[bet.away_college]}.png`}
                  alt={bet.away_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />

                {toCollegeName[bet.away_college]}
              </strong>
            </div>

            <div className="text-left hidden md:block">
              <strong>{bet.betAmount.toFixed(2)} coins wagered</strong>
            </div>
            <div className="text-left hidden md:block">
              <strong>
                {(bet.betAmount * bet.betOdds).toFixed(2)} coins to win
              </strong>
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
              <strong>Cancel</strong>
            </div>

            <div className="text-right md:hidden text-xs">
              <strong>{bet.betAmount.toFixed(2)} coins wagered</strong>
            </div>
            <div className="text-right md:hidden text-xs">
              <strong>
                {(bet.betAmount * bet.betOdds).toFixed(2)} coins to win
              </strong>
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
              <strong>Cancel</strong>
            </div>
          </>
        ) : bet.betOption == bet.away_college ? (
          // EXAMPLE: away college bet
          <>
            <div className="items-start text-xs md:text-sm">
              <strong className="text-black flex items-center">
                <Image
                  src={`/college_flags/${toCollegeName[bet.home_college]}.png`}
                  alt={bet.home_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />
                {toCollegeName[bet.home_college]}
              </strong>
            </div>
            <div
              className={`${
                bet.away_college === "" ? "hidden" : "block"
              } items-start text-xs md:text-sm`}
            >
              <strong
                className="text-black flex items-center"
                style={{
                  background: "#D7FFEA",
                  border: "6px solid #D7FFEA",
                  borderRadius: "10px",
                }}
              >
                <Image
                  src={`/college_flags/${toCollegeName[bet.away_college]}.png`}
                  alt={bet.away_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />

                {toCollegeName[bet.away_college]}
              </strong>
            </div>

            <div className="text-left hidden md:block">
              <strong>{bet.betAmount.toFixed(2)} coins wagered</strong>
            </div>
            <div className="text-left hidden md:block">
              <strong>
                {(bet.betAmount * bet.betOdds).toFixed(2)} coins to win
              </strong>
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
              <strong>Cancel</strong>
            </div>

            <div className="text-right md:hidden text-xs">
              <strong>{bet.betAmount.toFixed(2)} coins wagered</strong>
            </div>
            <div className="text-right md:hidden text-xs">
              <strong>
                {(bet.betAmount * bet.betOdds).toFixed(2)} coins to win
              </strong>
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
              <strong>Cancel</strong>
            </div>
          </>
        ) : bet.betOption == "Draw" ? (
          // EXAMPLE: draw
          <>
            <div className="items-start text-xs md:text-sm">
              <strong
                className="text-black flex items-center"
                style={{
                  background: "#CFF6FF",
                  border: "6px solid #CFF6FF",
                  borderRadius: "10px",
                }}
              >
                <Image
                  src={`/college_flags/${toCollegeName[bet.home_college]}.png`}
                  alt={bet.home_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />
                {toCollegeName[bet.home_college]}
              </strong>
            </div>
            <div
              className={`${
                bet.away_college === "" ? "hidden" : "block"
              } items-start text-xs md:text-sm`}
            >
              <strong
                className="text-black flex items-center"
                style={{
                  background: "#CFF6FF",
                  border: "6px solid #CFF6FF",
                  borderRadius: "10px",
                }}
              >
                <Image
                  src={`/college_flags/${toCollegeName[bet.away_college]}.png`}
                  alt={bet.away_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />

                {toCollegeName[bet.away_college]}
              </strong>
            </div>
            <div className="text-left hidden md:block">
              <strong>{bet.betAmount.toFixed(2)} coins wagered</strong>
            </div>
            <div className="text-left hidden md:block">
              <strong>
                {(bet.betAmount * bet.betOdds).toFixed(2)} coins to win
              </strong>
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
              <strong>Cancel</strong>
            </div>

            <div className="text-right md:hidden text-xs">
              <strong>{bet.betAmount.toFixed(2)} coins wagered</strong>
            </div>
            <div className="text-right md:hidden text-xs">
              <strong>
                {(bet.betAmount * bet.betOdds).toFixed(2)} coins to win
              </strong>
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
              <strong>Cancel</strong>
            </div>
          </>
        ) : (
          // EXAMPLE: forfeit
          <>
            <div className="items-start text-xs md:text-sm">
              <strong
                className="text-black flex items-center"
                style={{
                  background: "#E4E4E4",
                  border: "6px solid #E4E4E4",
                  borderRadius: "10px",
                }}
              >
                <Image
                  src={`/college_flags/${toCollegeName[bet.home_college]}.png`}
                  alt={bet.home_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />
                {toCollegeName[bet.home_college]}
              </strong>
            </div>
            <div
              className={`${
                bet.away_college === "" ? "hidden" : "block"
              } items-start text-xs md:text-sm`}
            >
              <strong
                className="text-black flex items-center"
                style={{
                  background: "#E4E4E4",
                  border: "6px solid #E4E4E4",
                  borderRadius: "10px",
                }}
              >
                <Image
                  src={`/college_flags/${toCollegeName[bet.away_college]}.png`}
                  alt={bet.away_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />

                {toCollegeName[bet.away_college]}
              </strong>
            </div>

            <div className="text-left hidden md:block">
              <strong>{bet.betAmount.toFixed(2)} coins wagered</strong>
            </div>
            <div className="text-left hidden md:block">
              <strong>
                {(bet.betAmount * bet.betOdds).toFixed(2)} coins to win
              </strong>
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
              <strong>Cancel</strong>
            </div>

            <div className="text-right md:hidden text-xs">
              <strong>{bet.betAmount.toFixed(2)} coins wagered</strong>
            </div>
            <div className="text-right md:hidden text-xs">
              <strong>
                {(bet.betAmount * bet.betOdds).toFixed(2)} coins to win
              </strong>
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
              <strong>Cancel</strong>
            </div>
          </>
        )}
      </div>

      <div className="text-center px-2 py-1">{emojiMap[bet.sport]}</div>
    </div>
  );
};

export default TableRow;
