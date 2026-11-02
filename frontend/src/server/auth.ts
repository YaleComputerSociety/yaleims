// Who is calling, and what they may do. The session cookie says who (the
// identity from the Yale login, server/session.ts); what they may do is read
// from Firestore on each request that asks, so a role taken away works at
// once, not when a 7-day token runs out. Every permission is a named rule in
// `can` below: the one place to read or change who may do what.
//
// Roles live in three places (REDESIGN §4): users/{email}.roles (admin, dev),
// the current season's player doc (college_rep, supervisor; its college) and
// the teams the player captains this season.
import "server-only";
import { ApiError } from "@/lib/api/core";
import type { GlobalRole, PlayerDoc, UserDoc } from "@/types/firestore";
import type { Actor } from "./data/auditLog";
import { getPlayer } from "./data/players";
import { getCurrentSeasonId } from "./data/seasons";
import { listCaptainTeams } from "./data/teams";
import { getUser } from "./data/users";
import { mergedRoles } from "./services/roles";
import { getIdentity, type Identity } from "./session";

// ── The viewer ─────────────────────────────────────────────────────────────

/**
 * The signed-in caller: their identity, plus lookups of what they are. Each
 * lookup reads Firestore the first time it is called and returns the same
 * answer after that, so a route never reads one twice.
 */
export interface Viewer extends Identity {
  /** Their users/{email} doc (null: none yet). */
  user(): Promise<UserDoc | null>;
  /** users/{email}.roles. */
  globalRoles(): Promise<GlobalRole[]>;
  /** Their player doc in the current season (college, season roles); null if they aren't a player. */
  player(): Promise<PlayerDoc | null>;
  /** The sport ids of the teams they captain this season. */
  captainOf(): Promise<string[]>;
  /** Who they are in the audit log (D32): email and every role they hold. */
  actor(): Promise<Actor>;
}

/** The caller, or null when they aren't signed in (no, expired or invalid session cookie). */
export async function getViewer(): Promise<Viewer | null> {
  const identity = await getIdentity();
  return identity && viewerOf(identity);
}

function viewerOf(identity: Identity): Viewer {
  const seasonId = once(getCurrentSeasonId);
  const user = once((): Promise<UserDoc | null> => getUser(identity.email));
  const player = once(async () => {
    const season = await seasonId();
    return season ? getPlayer(season, identity.email) : null;
  });
  const captainOf = once(async () => {
    const season = await seasonId();
    return season ? (await listCaptainTeams(season, identity.email)).map((team) => team.sportId) : [];
  });
  return {
    ...identity,
    user,
    globalRoles: async () => (await user())?.roles ?? [],
    player,
    captainOf,
    actor: async () => {
      const [u, p, teams] = await Promise.all([user(), player(), captainOf()]);
      return { userId: identity.email, roles: mergedRoles(u, p, teams.length > 0) };
    },
  };
}

/** Runs `load` the first time the result is asked for, and hands out that same promise after. */
function once<T>(load: () => Promise<T>): () => Promise<T> {
  let result: Promise<T> | undefined;
  return () => (result ??= load());
}

/** The caller; 401 when they aren't signed in. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    throw new ApiError("unauthenticated", "Sign in to do this.");
  }
  return viewer;
}

/**
 * The caller, if `rule` lets them; 401 when they aren't signed in, 403 when
 * it doesn't: `const viewer = await authorize(can.nameMvps, collegeId)`.
 */
export async function authorize<Args extends unknown[]>(
  rule: (viewer: Viewer, ...args: Args) => Promise<boolean>,
  ...args: Args
): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!(await rule(viewer, ...args))) {
    throw new ApiError("forbidden", "You don't have permission to do this.");
  }
  return viewer;
}

/**
 * Some actions work on the current season only, as they always have
 * (PHASE-2D-PLAN §3.3): 409 for any other season.
 */
export async function requireCurrentSeason(seasonId: string): Promise<void> {
  if (seasonId !== (await getCurrentSeasonId())) {
    throw new ApiError("conflict", "This can only be done in the current season.");
  }
}

// ── The permissions ────────────────────────────────────────────────────────
// As today (PHASE-2D-PLAN §3.4): most admin work is open to admin or dev,
// the champion to admin only, roles to dev only (D43 later makes all of it
// "admin"; supervisors get scoring with U1). A rep acts for their own
// college, this season.

const hasGlobalRole = async (viewer: Viewer, ...roles: GlobalRole[]) =>
  (await viewer.globalRoles()).some((role) => roles.includes(role));

const isAdminOrDev = (viewer: Viewer) => hasGlobalRole(viewer, "admin", "dev");

async function isRepOf(viewer: Viewer, collegeId: string): Promise<boolean> {
  const player = await viewer.player();
  return !!player && player.roles.includes("college_rep") && player.collegeId === collegeId;
}

export const can = {
  /** Upload and edit games; create and delete brackets and tournaments. */
  editSchedule: isAdminOrDev,
  /** Score and undo games; see every score report, with reporters' emails, and resolve them. */
  score: isAdminOrDev,
  /** Name the season's champion and run the celebration. */
  setChampion: (viewer: Viewer) => hasGlobalRole(viewer, "admin"),
  /** See who is admin or dev, and set anyone's roles. */
  manageRoles: (viewer: Viewer) => hasGlobalRole(viewer, "dev"),
  /** A college's players this season (the captain and MVP pickers, the roles page). */
  listPlayers: async (viewer: Viewer, collegeId: string) =>
    (await hasGlobalRole(viewer, "dev")) || isRepOf(viewer, collegeId),
  /** Make a college's players captains of its teams, or not. */
  manageCaptains: async (viewer: Viewer, collegeId: string) =>
    (await isAdminOrDev(viewer)) || isRepOf(viewer, collegeId),
  /** See and name a college's weekly MVPs. */
  nameMvps: async (viewer: Viewer, collegeId: string) =>
    (await isAdminOrDev(viewer)) || isRepOf(viewer, collegeId),
  /** See a college's reps (with emails) and captains: its own players. */
  seeLeaders: async (viewer: Viewer, collegeId: string) => (await viewer.player())?.collegeId === collegeId,
};
