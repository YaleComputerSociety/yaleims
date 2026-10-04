// Users: users/{email} and their per-season docs users/{email}/seasons/{seasonId}.
import "server-only";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import { WithId, isNotFound, withId } from "./util";

/** users/{email}. Old docs also hold frozen betting fields, not typed here. */
export interface UserDoc {
  email?: string;
  firstname?: string;
  lastname?: string;
  college?: string | null;
  username?: string;
  mRoles?: string[];
  sportsCaptainOf?: string[];
  /** Legacy single role; roles live in mRoles. */
  role?: string;
}

/** A game a user signed up for, as stored on the user-season doc. */
export interface UserSeasonMatch {
  id: number | string;
  timestamp: string;
}

/** users/{email}/seasons/{seasonId}. Some old docs hold `matches` as a non-array. */
export interface UserSeasonDoc {
  matches?: UserSeasonMatch[];
}

export async function getUser(email: string): Promise<UserDoc | null> {
  const snap = await adminDb.doc(paths.user(email)).get();
  return snap.exists ? (snap.data() as UserDoc) : null;
}

/** Users holding `role` in mRoles, across all colleges. */
export async function listUsersWithRole(role: string): Promise<WithId<UserDoc>[]> {
  const snap = await adminDb
    .collection(paths.users)
    .where("mRoles", "array-contains", role)
    .get();
  return snap.docs.map((d) => withId<UserDoc>(d));
}

/** Users of `college` holding any of `roles` in mRoles. */
export async function listCollegeUsersWithAnyRole(
  college: string,
  roles: string[]
): Promise<WithId<UserDoc>[]> {
  const snap = await adminDb
    .collection(paths.users)
    .where("college", "==", college)
    .where("mRoles", "array-contains-any", roles)
    .get();
  return snap.docs.map((d) => withId<UserDoc>(d));
}

/** Sets mRoles and sportsCaptainOf. Returns false if the user doesn't exist. */
export async function updateUserRoles(
  email: string,
  mRoles: string[],
  sportsCaptainOf: string[]
): Promise<boolean> {
  try {
    await adminDb.doc(paths.user(email)).update({ mRoles, sportsCaptainOf });
    return true;
  } catch (err) {
    if (isNotFound(err)) return false;
    throw err;
  }
}

/** All users of a college. */
export async function listCollegeUsers(college: string): Promise<UserDoc[]> {
  const snap = await adminDb
    .collection(paths.users)
    .where("college", "==", college)
    .get();
  return snap.docs.map((d) => d.data() as UserDoc);
}

export async function getUserSeason(
  email: string,
  seasonId: string
): Promise<UserSeasonDoc | null> {
  const snap = await adminDb.doc(paths.userSeason(email, seasonId)).get();
  return snap.exists ? (snap.data() as UserSeasonDoc) : null;
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
