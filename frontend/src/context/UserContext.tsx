"use client";

import { doc, onSnapshot } from "firebase/firestore";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { db } from "../../lib/firebase";
import { paths } from "@/lib/paths";
import type { SessionUser, VerifyResponse } from "@src/types/api";

interface AuthContextType {
  isLoggedIn: boolean;
  user: SessionUser | null;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<SessionUser | null>> | null;
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

const LOGOUT_VERSION = "2"; // Increment this to force a new logout
const LOGOUT_KEY = "logout_version";

let authCheckPromise: Promise<void> | null = null;

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const casSignOut = useCallback(async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/logout");
      if (response.ok) {
        setIsLoggedIn(false);
        setUser(null);
        setLoading(false);
        window.location.href = "/";
      }
    } catch (error) {
      setLoading(false);
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

    setLoading(true);
    authCheckPromise = fetch("/api/auth/verify")
      .then(async (response) => {
        if (response.ok) {
          const data: VerifyResponse = await response.json();
          setIsLoggedIn(data.isLoggedIn);
          setUser(data.isLoggedIn ? data.user : null);
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
        setLoading(false);
      });

    return authCheckPromise;
  }, [casSignOut]);

  useEffect(() => {
    if (!user?.email) return;
    const unsub = onSnapshot(doc(db, paths.user(user.email)), (snap) => {
      const d = snap.data();
      if (!d) return;
      setUser((prev) =>
        prev
          ? {
              ...prev,
              role: d.role,
              mRoles: d.mRoles,
              username: d.username,
            }
          : prev
      );
      // Re-issue the session cookie; the server reads roles from Firestore.
      fetch("/api/auth/verify");
    });
    return () => unsub();
  }, [user?.email]);

  useEffect(() => {
    checkCasAuth();
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        isLoggedIn,
        checkCasAuth,
        casSignOut,
        setUser: setUser,
        loading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
