"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { setCookie, getCookie, deleteCookie } from "cookies-next";
import { auth, provider, signInWithPopup } from "../../lib/firebase";
import { onIdTokenChanged } from "firebase/auth";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, check cookies for user state
  useEffect(() => {
    const token = getCookie("token"); // Get token from cookies
    const userData = getCookie("user"); // Get user data from cookies (serialized JSON)
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser); // Restore user from cookies
      } catch (err) {
        console.error("Error parsing user data from cookies:", err);
        setUser(null);
      }
    }
    setLoading(false); // Stop loading after initial check
  }, []);

  const saveUserToCookies = (userData, token) => {
    setCookie("token", token, { path: "/", maxAge: 60 * 60 * 24 * 7 }); // Store token for 7 days
    setCookie("user", JSON.stringify(userData), {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    }); // Serialize user data
  };

  const clearUserCookies = () => {
    deleteCookie("token", { path: "/" });
    deleteCookie("user", { path: "/" });
  };

  const wrappedSetUser = (updatedUser) => {
    if (updatedUser && typeof updatedUser === "object") {
      setUser(updatedUser); // Update the state
      const token = getCookie("token"); // Get the existing token from cookies
      if (token) {
        saveUserToCookies(updatedUser, token); // Sync to cookies only if token exists
      } else {
        console.error("Token is missing. Cannot save user to cookies.");
      }
    } else if (!updatedUser) {
      setUser(null); // Clear the user state
      clearUserCookies(); // Clear cookies if the user is null
    } else {
      console.error("Invalid user object provided:", updatedUser);
    }
  };

  const signIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const signedInUser = result.user;
      const userToken = await signedInUser.getIdToken(true)
      sessionStorage.setItem("userToken", userToken)

      if (!signedInUser.email.endsWith("@yale.edu")) {
        throw new Error("You must use a Yale email to sign in.");
      }

      const data = await fetchOrAddUserData(signedInUser.email); // Fetch or create user in backend

      const userData = {
        name: signedInUser.displayName,
        email: signedInUser.email,
        username: data.user.username,
        college: data.user.college,
        points: data.user.points,
        role: data.user.role,
        matches_played: data.user.matches_played,
      };

      setUser(userData); // Update user state
      saveUserToCookies(userData, signedInUser.accessToken); // Save user and token in cookies
    } catch (error) {
      console.error("Error during sign-in:", error.message);
      alert(error.message);
      setUser(null); // Ensure the user state is cleared if sign-in fails
    }
  };

  useEffect(() => {
    const minutes=4;
    const interval=minutes * 60 * 10000;
    // console.log("authcontext")
    
    const handle = setInterval(async () => {
        const user = auth.currentUser;
        if (user) {
            const newToken = await user.getIdToken(true);
            sessionStorage.setItem("userToken", newToken)
            // console.log(user);
        }
    }, interval);
    return () => clearInterval(handle);
  }, [])

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
      value={{ user, signIn, setUser: wrappedSetUser, signOut, loading }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
