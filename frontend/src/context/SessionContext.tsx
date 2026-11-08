"use client";
// Who is signed in, for the pages: GET /api/auth/session once per visit (the
// server reads the roles from Firestore each time, so a role change shows on
// the next visit), and again after the viewer changes their profile (refresh). Signing in is a navigation to /api/auth/login?from=<page>;
// signing out is POST /api/auth/logout.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchSession, logout, type SessionViewer } from "@/lib/api/auth";

interface SessionState {
  /** The signed-in person; null when signed out (or before the first answer). */
  viewer: SessionViewer | null;
  /** True until the first answer. */
  loading: boolean;
  signOut: () => Promise<void>;
  /** Reads the session again (after a name change or a directory lookup); keeps the viewer when that fails. */
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionState>({
  viewer: null,
  loading: true,
  signOut: async () => {},
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewerState] = useState<SessionViewer | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(
    () =>
      fetchSession()
        .then((session) => setViewerState(session.signedIn ? session.viewer : null))
        // The server couldn't answer (e.g. Firestore is down): keep the state we have.
        .catch((err) => console.error("Couldn't read the session:", err)),
    []
  );

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await logout();
      setViewerState(null);
      // A full page load, so no page keeps the signed-in state.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/";
    } catch (err) {
      console.error("Logout error:", err);
    }
  }, []);

  return (
    <SessionContext.Provider value={{ viewer, loading, signOut, refresh }}>{children}</SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);

/** Whether the viewer holds any of `roles` ("captain": captains a team this season). */
export function hasRole(viewer: SessionViewer | null, ...roles: string[]): boolean {
  if (!viewer) return false;
  return roles.some((role) => (role === "captain" ? viewer.captainOf.length > 0 : (viewer.roles as string[]).includes(role)));
}
