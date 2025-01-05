import { Match } from "@src/types/components";
import { useState } from "react";
import { useUser } from "@src/context/UserContext";
import { addingMatch } from "@src/types/components";

const addingMatchDefault: addingMatch = {
  isAddingToCalendar: false,
  matchId: "",
};

export const useAddToGCal = () => {
  const { googleAccessToken, signIn } = useUser();
  const [addingToCalendar, setAddingToCalendar] =
    useState<addingMatch>(addingMatchDefault);

  const addToGCal = async (match: Match) => {
    try {
      const addingState: addingMatch = {
        isAddingToCalendar: true,
        matchId: match.id,
      };
      setAddingToCalendar(addingState);

      if (
        !googleAccessToken ||
        (googleAccessToken.expiry && Date.now() >= googleAccessToken.expiry)
      ) {
        console.log("Google token expired. Triggering login...");

        await signIn(); // Trigger Google login
        if (!googleAccessToken) {
          throw new Error("Failed to retrieve Google token.");
        }
      }

      const response = await fetch("/api/google-calendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${googleAccessToken.token}`,
        },
        body: JSON.stringify({ accessToken: googleAccessToken.token, match }),
      });

      const result = await response.json();

      if (response.ok) {
        alert("Event added to your Google Calendar!");
      } else {
        alert("Failed to add event: " + result.error);
      }
    } catch (error) {
      console.error("Error adding to Google Calendar:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setAddingToCalendar(addingMatchDefault);
    }
  };

  return { addToGCal, addingToCalendar };
};
