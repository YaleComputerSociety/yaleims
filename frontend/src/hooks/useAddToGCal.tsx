import { useGoogleLogin } from "@react-oauth/google";
import {Match} from "@src/types/components"

let cachedToken: string | null = null;
let tokenExpiryTime: number | null = null;

export const useAddToGCal = () => {
  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: (response) => {
      cachedToken = response.access_token;
      tokenExpiryTime = Date.now() + response.expires_in * 1000;
    },
    onError: () => {
      alert("Google login failed. Please try again.");
    },
    scope: "https://www.googleapis.com/auth/calendar.events",
  });

  const addToGCal = async (match: Match) => {
    try {
      if (!cachedToken || (tokenExpiryTime && Date.now() >= tokenExpiryTime)) {
        await triggerGoogleLogin();
        if (!cachedToken) {
          throw new Error("Failed to retrieve Google token.");
        }
      }

      const response = await fetch("/api/google-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: cachedToken, match }),
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
    }
  };

  return { addToGCal };
};
