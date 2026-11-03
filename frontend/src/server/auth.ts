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
      const roles: string[] = ["user", ...(u?.roles ?? []), ...(p?.roles ?? [])];
      if (teams.length > 0) roles.push("captain");
      return { userId: identity.email, roles };
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
// The roles: admin, supervisor, college rep, captain, user. These are
// defaults until the per-role rules are settled (P10, PHASE-3A-PLAN): an
// admin may do everything (`dev` counts as admin, D43); a supervisor runs
// game day (attendance, scores, the schedule) for every game; a rep acts for
// their own college and a captain for their own team, this season.

const hasGlobalRole = async (viewer: Viewer, ...roles: GlobalRole[]) =>
  (await viewer.globalRoles()).some((role) => roles.includes(role));

const isAdmin = (viewer: Viewer) => hasGlobalRole(viewer, "admin", "dev");

/** Admin, or this season's supervisor. */
async function isSupervisor(viewer: Viewer): Promise<boolean> {
  return (await isAdmin(viewer)) || !!(await viewer.player())?.roles.includes("supervisor");
}

async function isRepOf(viewer: Viewer, collegeId: string): Promise<boolean> {
  const player = await viewer.player();
  return !!player && player.roles.includes("college_rep") && player.collegeId === collegeId;
}

async function isCaptainOf(viewer: Viewer, collegeId: string, sportId?: string): Promise<boolean> {
  const [player, sports] = await Promise.all([viewer.player(), viewer.captainOf()]);
  return player?.collegeId === collegeId && (sportId === undefined ? sports.length > 0 : sports.includes(sportId));
}

export const can = {
  /** Create, edit, cancel and delete games; create and delete brackets and tournaments. */
  editSchedule: isSupervisor,
  /** Score and undo games; see every score report, with reporters' emails, and resolve them. */
  score: isSupervisor,
  /** Mark who came to a game, add walk-ins and guests, at any time (D34 R4, R5). */
  takeAttendance: isSupervisor,
  /** Confirm, remove and add a college's players on its team's game in a sport, until it starts (D34 R3). */
  manageRoster: async (viewer: Viewer, collegeId: string, sportId: string) =>
    (await isSupervisor(viewer)) || isCaptainOf(viewer, collegeId, sportId),
  /** Name the season's champion and run the celebration. */
  setChampion: isAdmin,
  /** See who holds a role, and set anyone's roles. */
  manageRoles: isAdmin,
  /** A college's players this season (the captain, MVP and roster pickers, the roles page). */
  listPlayers: async (viewer: Viewer, collegeId: string) =>
    (await isSupervisor(viewer)) || (await isRepOf(viewer, collegeId)) || isCaptainOf(viewer, collegeId),
  /** Make a college's players captains of its teams, or not. */
  manageCaptains: async (viewer: Viewer, collegeId: string) =>
    (await isAdmin(viewer)) || isRepOf(viewer, collegeId),
  /** See and name a college's weekly MVPs. */
  nameMvps: async (viewer: Viewer, collegeId: string) =>
    (await isAdmin(viewer)) || isRepOf(viewer, collegeId),
  /** See a college's reps (with emails) and captains: its own players. */
  seeLeaders: async (viewer: Viewer, collegeId: string) => (await viewer.player())?.collegeId === collegeId,
};
