"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { setCookie, getCookie, deleteCookie } from "cookies-next";
import { auth, provider, signInWithPopup } from "../../lib/firebase";
import { GoogleAuthProvider } from "firebase/auth";
import { set } from "date-fns";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [googleAccessToken, setGoogleAccessToken] = useState(null);

  // On first load, check cookies for user state
  useEffect(() => {
    const token = getCookie("token"); // Get token from cookies
    const userData = getCookie("user"); // Get user data from cookies (serialized JSON)
    const googleToken = getCookie("googleToken"); // Get google token from cookies
    if (token && userData && googleToken) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser); // Restore user from cookies

        const googleTokenObj = JSON.parse(googleToken);
        setGoogleAccessToken(googleTokenObj); // Restore google token from cookies
      } catch (err) {
        console.error("Error parsing user data from cookies:", err);
        setUser(null);
      }
    }
    setLoading(false); // Stop loading after initial check
  }, []);

  const saveUserToCookies = (userData, token, googleToken) => {
    setCookie("token", token, { path: "/", maxAge: 60 * 60 * 24 * 7 }); // Store token for 7 days
    setCookie("user", JSON.stringify(userData), {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    }); // Serialize user data
    setCookie("googleToken", JSON.stringify(googleToken), {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  };

  const clearUserCookies = () => {
    deleteCookie("token", { path: "/" });
    deleteCookie("user", { path: "/" });
    deleteCookie("googleToken", { path: "/" });
  };

  const signIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/calendar");
      const result = await signInWithPopup(auth, provider);
      const signedInUser = result.user;
      const googleAccessToken = result._tokenResponse.oauthAccessToken;
      const tokenExpiryTime =
        Date.now() + result._tokenResponse.oauthExpireIn * 1000;

      const googleToken = {
        token: googleAccessToken,
        expiry: tokenExpiryTime,
      };

      setGoogleAccessToken(googleToken); // Update user google token

      if (!signedInUser.email.endsWith("@yale.edu")) {
        throw new Error("You must use a Yale email to sign in.");
      }

      const data = await fetchOrAddUserData(signedInUser.email); // Fetch or create user in backend

      const userData = {
        name: signedInUser.displayName,
        email: signedInUser.email,
        matches: data.user.matches,
        college: data.user.college,
        points: data.user.points,
        role: data.user.role,
      };

      setUser(userData); // Update user state
      saveUserToCookies(userData, signedInUser.accessToken, googleToken); // Save user and token in cookies
    } catch (error) {
      console.error("Error during sign-in:", error.message);
      alert(error.message);
      setUser(null); // Ensure the user state is cleared if sign-in fails
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
      setUser(null); // Clear user state
      clearUserCookies(); // Remove user and token from cookies
    } catch (error) {
      console.error("Sign-out error:", error.message);
    }
  };

  const fetchOrAddUserData = async (email) => {
    try {
      const response = await fetch(
        "https://us-central1-yims-125a2.cloudfunctions.net/fetchOrAddUser",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error fetching or adding user data:", error);
      throw error;
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        signIn,
        signOut,
        loading,
        googleAccessToken,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
