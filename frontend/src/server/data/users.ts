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

export async function getUserSeason(
  email: string,
  seasonId: string
): Promise<UserSeasonDoc | null> {
  const snap = await adminDb.doc(paths.userSeason(email, seasonId)).get();
  return snap.exists ? (snap.data() as UserSeasonDoc) : null;
}
