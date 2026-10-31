// Users: users/{email} (identity across seasons, global roles) and
// usernames/{username} (who holds a username). Old user docs also hold frozen
// pre-v3 fields (mRoles, college, sportsCaptainOf, betting totals); reads
// return only the v3 fields (D25).
import "server-only";
import type { DocumentData, DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { legacyPaths, paths } from "@/lib/paths";
import type { GlobalRole, UserDoc, WithId } from "@/types/firestore";
import type { UserSeasonDoc, UserSeasonMatch } from "@/types/legacy";
import { pickFields } from "./util";

const USER_FIELDS: Record<keyof UserDoc, true> = {
  email: true, firstname: true, lastname: true, username: true,
  roles: true, claimedAt: true, createdBy: true,
};

/**
 * A stored user's v3 fields. A doc the migration hasn't reached yet (made by
 * the old code during the cutover) has no roles and counts as claimed.
 */
export function readUser(data: DocumentData): UserDoc {
  const user = pickFields<UserDoc>(data, USER_FIELDS);
  return { ...user, roles: user.roles ?? [], claimedAt: user.claimedAt ?? null, createdBy: user.createdBy ?? null };
}

export function userRef(email: string): DocumentReference {
  return adminDb.doc(paths.user(email));
}

export function usernameRef(username: string): DocumentReference {
  return adminDb.doc(paths.username(username));
}

/** { count }: how many usernames have been generated. */
export function usernameCounterRef(): DocumentReference {
  return adminDb.doc(paths.usernameCounter);
}

export async function getUser(email: string): Promise<UserDoc | null> {
  const snap = await userRef(email).get();
  return snap.exists ? readUser(snap.data()!) : null;
}

/** The users with these emails (missing ones left out), by email. */
export async function getUsers(emails: string[]): Promise<Map<string, UserDoc>> {
  if (emails.length === 0) return new Map();
  const snaps = await adminDb.getAll(...emails.map(userRef));
  return new Map(snaps.filter((s) => s.exists).map((s) => [s.id, readUser(s.data()!)]));
}

/** Users holding a global role. */
export async function listUsersWithRole(role: GlobalRole): Promise<WithId<UserDoc>[]> {
  const snap = await adminDb.collection(paths.users).where("roles", "array-contains", role).get();
  return snap.docs.map((d) => ({ id: d.id, ...readUser(d.data()) }));
}

/**
 * Gives the user `username` and frees their old one, unless another user
 * already holds it. Checked and written in one transaction.
 */
export async function changeUsername(
  email: string,
  username: string
): Promise<"ok" | "taken" | "no-user"> {
  return adminDb.runTransaction(async (tx) => {
    const [usernameSnap, userSnap] = await tx.getAll(usernameRef(username), userRef(email));
    if (usernameSnap.exists) return "taken";
    if (!userSnap.exists) return "no-user";

    const oldUsername = readUser(userSnap.data()!).username;
    tx.set(usernameRef(username), { userId: email });
    tx.update(userRef(email), { username });
    if (oldUsername) tx.delete(usernameRef(oldUsername));
    return "ok";
  });
}

// ── Pre-v3 user-season docs, users/{email}/seasons/{seasonId}: sign-ups use
// them until the roster moves to v3 (the next step of the v3 series). ──────

const SIGNUP_FIELDS: Record<keyof UserSeasonMatch, true> = { id: true, timestamp: true };

/**
 * A stored user-season doc as reads return it: only `matches`, each signup
 * only { id, timestamp }. A non-array `matches` is returned as stored (D25).
 */
function readUserSeason(data: DocumentData): UserSeasonDoc {
  const { matches } = data;
  if (matches === undefined) return {};
  return {
    matches: Array.isArray(matches)
      ? matches.map((m) =>
          m && typeof m === "object" ? pickFields<UserSeasonMatch>(m, SIGNUP_FIELDS) : m
        )
      : matches,
  };
}

/** The user-season doc, for services that change it in a transaction. */
export function userSeasonRef(
  email: string,
  seasonId: string
): DocumentReference<UserSeasonDoc> {
  return adminDb.doc(legacyPaths.userSeason(email, seasonId)) as DocumentReference<UserSeasonDoc>;
}

export async function getUserSeason(
  email: string,
  seasonId: string
): Promise<UserSeasonDoc | null> {
  const snap = await adminDb.doc(legacyPaths.userSeason(email, seasonId)).get();
  return snap.exists ? readUserSeason(snap.data()!) : null;
}

/**
 * The games a user signed up for that start after `now`, or null if the
 * user has no doc for that season.
 */
export async function listUpcomingSignups(
  email: string,
  seasonId: string,
  now: Date
): Promise<UserSeasonMatch[] | null> {
  const userSeason = await getUserSeason(email, seasonId);
  if (!userSeason) return null;
  const matches = Array.isArray(userSeason.matches) ? userSeason.matches : [];
  return matches.filter((m) => new Date(m.timestamp) > now);
}
