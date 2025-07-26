"use client";

import React, { useState, useEffect } from "react";
import Bracket from "@src/components/Brackets/Bracket";
import { sports } from "@src/utils/helpers";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { Ubuntu } from "next/font/google";

const ubuntu = Ubuntu({
  subsets: ["latin"],
  weight: ["400", "700"],
});

interface FirestoreMatch {
  bracket_placement: number;
  match_id: string;
  round: string;
}

const BracketsPage: React.FC = () => {
  const [sport, setSport] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [bracket, setBracket] = useState<FirestoreMatch[] | null>(null); // update type with a bracket type

  const handleSportChange = (sport: string) => {
    setSport(sport);
  };

  useEffect(() => {
    const fetchBracket = async () => {
      try {
        setLoading(true);
        setError(null);

        const bracketDocRef = doc(db, "brackets", sport);
        const bracketDoc = await getDoc(bracketDocRef);

        if (!bracketDoc.exists()) {
          setError(`Bracket for ${sport} not found`);
          setBracket(null);
        } else {
          setBracket(bracketDoc.data().matches);
        }
      } catch (err) {
        console.error(`Error fetching bracket for ${sport}:`, err);
        setError(`Bracket doesn't yet exist!`);
      } finally {
        setLoading(false);
      }
    };

    if (sport) {
      fetchBracket();
    }
  }, [sport]);

  // TODO: fix loading and error displays

  // SMALL BUG: "Brackets" header slightly shifts when a new sport is selected?
  // may need to just redo the formatting of the header, may not be ideal

  return (
    <div className={ubuntu.className}>
      <div className="p-6 min-h-screen">
        {/* header */}
        <div className="relative flex items-center w-full mb-6">
          {/* dropdown menu */}
          <div className="absolute left-0">
            <select
              className="p-2 border border-gray-300 rounded"
              value={sport}
              onChange={(e) => handleSportChange(e.target.value)}
            >
              <option value="">Select Sport</option>
              {sports.map((sport) => (
                <option key={sport.name} value={sport.name}>
                  {sport.emoji} {sport.name}
                </option>
              ))}
            </select>
          </div>

          {/* TODO: loading state */}
          {loading && <p>loading...</p>}

          {/* TODO: error state */}
          {error && <p>no bracket yet!</p>}

          {/* title */}
          <h1 className="text-2xl sm:text-4xl font-bold w-full text-center">
            Brackets
          </h1>
        </div>
        {bracket ? <Bracket matches={bracket} /> : <p>No bracket</p>}
      </div>
    </div>
  );
};

export default BracketsPage;
