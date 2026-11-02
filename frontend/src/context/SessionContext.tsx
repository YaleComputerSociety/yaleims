"use client";
// Who is signed in, for the pages: GET /api/auth/session once per visit (the
// server reads the roles from Firestore each time, so a role change shows on
// the next visit). Signing in is a navigation to /api/auth/login?from=<page>;
// signing out is POST /api/auth/logout.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchSession, logout, type SessionViewer } from "@/lib/api/auth";

interface SessionState {
  /** The signed-in person; null when signed out (or before the first answer). */
  viewer: SessionViewer | null;
  /** True until the first answer. */
  loading: boolean;
  signOut: () => Promise<void>;
  /** Updates the viewer in place (the profile's new username). */
  setViewer: (update: (viewer: SessionViewer) => SessionViewer) => void;
}

const SessionContext = createContext<SessionState>({
  viewer: null,
  loading: true,
  signOut: async () => {},
  setViewer: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewerState] = useState<SessionViewer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSession()
      .then((session) => setViewerState(session.signedIn ? session.viewer : null))
      // The server couldn't answer (e.g. Firestore is down): keep the state we have.
      .catch((err) => console.error("Couldn't read the session:", err))
      .finally(() => setLoading(false));
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
      setViewerState(null);
      window.location.href = "/";
    } catch (err) {
      console.error("Logout error:", err);
    }
  }, []);

  const setViewer = useCallback(
    (update: (viewer: SessionViewer) => SessionViewer) => setViewerState((prev) => prev && update(prev)),
    []
  );

  return (
    <SessionContext.Provider value={{ viewer, loading, signOut, setViewer }}>{children}</SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);

/** Whether the viewer holds any of `roles` ("captain": captains a team this season). */
export function hasRole(viewer: SessionViewer | null, ...roles: string[]): boolean {
  if (!viewer) return false;
  return roles.some((role) => (role === "captain" ? viewer.captainOf.length > 0 : (viewer.roles as string[]).includes(role)));
}
