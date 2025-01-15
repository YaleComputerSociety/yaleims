import { useState, useEffect } from "react";
import Image from "next/image";
import { toCollegeName, sportsMap, emojiMap } from "@src/utils/helpers";

import { TableRowProps, Match } from "@src/types/components";
import { useUser } from "../../context/UserContext.jsx";

//TableRow Component
const TableRow: React.FC<TableRowProps> = ({
  match,
  handleCollegeClick,
  availablePoints,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState<string>("");
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [betDetails, setBetDetails] = useState<{
    email: string | null;
    matchId: string;
    betAmount: number;
    betOption: string;
    betOdds: string;
    timestamp: string;
  } | null>(null);
  const [isBetAdded, setIsBetAdded] = useState(false);

  const getUserEmail = () => {
    const { user } = useUser(); // Access the user object from the context

    // If user exists and has an email, return the email; otherwise return null
    return user ? user.email : null;
  };

  const userEmail = getUserEmail();

  const addBet = async (
    email,
    matchId,
    betAmount,
    betOption,
    betOdds,
    away_college,
    home_college,
    sport,
    timestamp
  ) => {
    try {
      const response = await fetch(
        "https://us-central1-yims-125a2.cloudfunctions.net/addBet",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            matchId,
            betAmount,
            betOption,
            betOdds,
            away_college,
            home_college,
            sport,
            timestamp,
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text(); // Log the response text for more info
        console.error(`Response not OK: ${response.status} - ${errorBody}`);
      } else {
        console.log("Bet added successfully!");
        setIsBetAdded(true);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    }
  };

  // Function to open modal and set selected option
  const handleOptionClick = (option: string) => {
    setSelectedOption(option);
    setIsModalOpen(true);
  };

  // Function to close the modal
  const closeModal = () => {
    setIsModalOpen(false);
    setInputValue(""); // Reset the input value when closing
  };

  // Function to handle submitting the input
  const handleSubmit = () => {
    const betAmount = parseFloat(inputValue);
    console.log(`Available points: ${availablePoints}`);

    if (availablePoints < 1) {
      alert("You don't have enough Ycoins");
      return;
    } else if (betAmount < 1 || betAmount > Math.min(250, availablePoints)) {
      alert(`Value must be between 1 and ${Math.min(250, availablePoints)}.`);
      return;
    }

    console.log(`Submitted ${selectedOption} with value: ${inputValue}`);

    const timestamp = match.timestamp;
    const date = new Date(timestamp);

    const betData = {
      email: userEmail,
      matchId: match.matchId,
      betAmount: betAmount, // Ensure it's a valid number
      betOption: selectedOption,
      betOdds: 2.5, // Example odds
      away_college: match.away_college,
      home_college: match.home_college,
      sport: match.sport,
      timestamp: date.toISOString(),
    };

    console.log("Bet details to be submitted:", betData);

    setBetDetails(betData);

    closeModal(); // Close the modal after submitting
  };

  useEffect(() => {
    if (betDetails && !isBetAdded) {
      const {
        email,
        matchId,
        betAmount,
        betOption,
        betOdds,
        away_college,
        home_college,
        sport,
        timestamp,
      } = betDetails;
      if (email) {
        addBet(
          email,
          matchId,
          betAmount,
          betOption,
          betOdds,
          away_college,
          home_college,
          sport,
          timestamp
        );
      }
    }
  }, [betDetails, isBetAdded]); // Runs whenever betDetails changes

  useEffect(() => {
    if (isBetAdded) {
      window.location.reload();
    }
  }, [isBetAdded]);

  return (
    <div className="bg-white grid grid-cols-[auto_1fr_auto] items-center">
      <div className="md:px-6 pl-2 py-4 text-xs md:text-sm text-gray-500">
        {new Date(match.timestamp).toLocaleString("en-US", {
          hour: "2-digit", // "04"
          minute: "2-digit", // "00"
          hour12: true, // "AM/PM"
        })}
      </div>

      {/* Combine Colleges and Scores into one column */}
      <div className="text-left md:px-6 py-4 px-3 text-sm grid md:grid-cols-[0.5fr_0.5fr_0.3fr_0.3fr] md:grid-rows-1 grid-rows-2 grid-flow-col gap-2 items-center">
        <>
          <div className="items-start text-xs md:text-sm">
            <strong
              className="cursor-pointer text-black flex items-center"
              onClick={() => handleOptionClick(match.home_college)}
              style={{
                background: "#D7FFEA",
                border: "6px solid #D7FFEA",
                borderRadius: "10px",
              }}
            >
              <Image
                src={`/college_flags/${toCollegeName[match.home_college]}.png`}
                alt={match.home_college}
                width={20}
                height={20}
                className="mr-2 object-contain"
                unoptimized
              />
              {toCollegeName[match.home_college]} +{sportsMap[match.sport]}0
            </strong>
          </div>

          <div
            className={`${
              match.away_college === "" ? "hidden" : "block"
            } items-start text-xs md:text-sm`}
            style={{
              background: "#D7FFEA",
              border: "6px solid #D7FFEA",
              borderRadius: "10px",
            }}
          >
            <strong
              className="cursor-pointer text-black flex items-center"
              onClick={() => handleOptionClick(match.away_college)}
            >
              <Image
                src={`/college_flags/${toCollegeName[match.away_college]}.png`}
                alt={match.away_college}
                width={20}
                height={20}
                className="mr-2 object-contain"
                unoptimized
              />
              {toCollegeName[match.away_college]} +{sportsMap[match.sport]}0
            </strong>
          </div>

          <div
            className="cursor-pointer text-left hidden md:block"
            onClick={() => handleOptionClick("Draw")}
            style={{
              background: "#CFF6FF",
              border: "6px solid #CFF6FF",
              borderRadius: "10px",
            }}
          >
            <strong>Draw +1000</strong>
          </div>
          <div
            className="cursor-pointer text-left hidden md:block"
            onClick={() => handleOptionClick("Forfeit")}
            style={{
              background: "#E4E4E4",
              border: "6px solid #E4E4E4",
              borderRadius: "10px",
            }}
          >
            <strong>Forfeit +1000</strong>
          </div>

          <div
            className="cursor-pointer text-right md:hidden text-xs"
            onClick={() => handleOptionClick("Draw")}
            style={{
              background: "#CFF6FF",
              border: "6px solid #CFF6FF",
              borderRadius: "10px",
            }}
          >
            <strong>Draw +1000</strong>
          </div>
          <div
            className="cursor-pointer text-right md:hidden text-xs"
            onClick={() => handleOptionClick("Forfeit")}
            style={{
              background: "#E4E4E4",
              border: "6px solid #E4E4E4",
              borderRadius: "10px",
            }}
          >
            <strong>Forfeit +1000</strong>
          </div>
        </>
      </div>

      <div className="text-center px-2 py-1">{emojiMap[match.sport]}</div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-1/3">
            <h3 className="text-lg font-semibold mb-4">
              Enter value for {selectedOption}
            </h3>
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="border p-2 w-full rounded-lg mb-4"
              placeholder={`Enter a value for ${selectedOption}`}
            />
            <div className="flex justify-end gap-4">
              <button
                className="bg-gray-300 px-4 py-2 rounded-lg"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded-lg"
                onClick={handleSubmit}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableRow;
