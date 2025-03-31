"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface User {
  name: string;
  netid: string;
  email: string;
  role: string;
  username: string;
  college: string;
  points: string;
  matches_played: number;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>> | null;
  casSignOut: () => Promise<void>;
  checkCasAuth: () => Promise<void>;
}

const UserContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  loading: true,
  setUser: null,
  casSignOut: async () => {},
  checkCasAuth: async () => {},
});

const LOGOUT_VERSION = "1"; // Increment this to force a new logout
const LOGOUT_KEY = "logout_version";

let authCheckPromise: Promise<void> | null = null;

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const casSignOut = useCallback(async () => {
    if (!isLoggedIn) return;

    setLoading(true)
    try {
      const response = await fetch("/api/auth/logout");
      if (response.ok) {
        setIsLoggedIn(false);
        setUser(null);
        setLoading(false)
        window.location.href = "/"; // Force reload after logout
      }
    } catch (error) {
      setLoading(false)
      console.error("Logout error:", error);
    }
  }, [isLoggedIn]);

  const checkCasAuth = useCallback(async () => {
    const storedVersion = localStorage.getItem(LOGOUT_KEY);

    if (storedVersion !== LOGOUT_VERSION) {
      console.log("Forcing logout due to version change");
      await casSignOut();
      localStorage.setItem(LOGOUT_KEY, LOGOUT_VERSION); // Mark logout as done
      return;
    }

    // If there's already a check in progress, return that promise
    if (authCheckPromise) {
      return authCheckPromise;
    }

    authCheckPromise = fetch("/api/auth/verify")
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          setIsLoggedIn(data.isLoggedIn);
          setUser(data.user);
        } else {
          setIsLoggedIn(false);
          setUser(null);
        }
      })
      .catch((error) => {
        console.error(error);
        setIsLoggedIn(false);
        setUser(null);
      })
      .finally(() => {
        authCheckPromise = null;
        setLoading(false)
      });

    return authCheckPromise;
  }, [ casSignOut ]);

  useEffect(() => {
    checkCasAuth();
  }, [checkCasAuth]);

  return (
    <UserContext.Provider
      value={{ user, isLoggedIn, checkCasAuth, casSignOut, setUser: setUser, loading }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
