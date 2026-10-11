// Users: users/{email}, their per-season docs users/{email}/seasons/{seasonId},
// and usernames/{username} (which user holds a username).
import "server-only";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
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
  matches_played?: number;
}

/** Fields of a new user doc. */
export interface NewUser {
  email: string;
  firstname: string;
  lastname: string;
  college: string | null;
}

/**
 * The user doc, or a newly created one (with an empty doc for `seasonId`)
 * when there is none. The new user gets `makeUsername(n)`, n being the next
 * value of the username counter, or "Anonymous" if that name is taken.
 * Counter, username, user and season docs change in one transaction.
 */
export async function getOrCreateUser(
  newUser: NewUser,
  seasonId: string,
  makeUsername: (n: number) => string
): Promise<{ user: UserDoc; created: boolean }> {
  const userRef = adminDb.doc(paths.user(newUser.email));
  const counterRef = adminDb.doc(paths.usernameCounter);
  return adminDb.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (userSnap.exists) {
      return { user: userSnap.data() as UserDoc, created: false };
    }
    const n = ((await tx.get(counterRef)).data()?.count || 0) + 1;
    let username = makeUsername(n);
    const usernameRef = adminDb.doc(paths.username(username));
    const taken = (await tx.get(usernameRef)).exists;
    if (taken) {
      username = "Anonymous";
    }

    const user = {
      ...newUser,
      role: "user", // legacy single role; roles live in mRoles
      mRoles: ["user"],
      username,
    };
    tx.set(counterRef, { count: n }, { merge: true });
    if (!taken) {
      tx.set(usernameRef, { email: newUser.email });
    }
    tx.set(userRef, user);
    tx.set(adminDb.doc(paths.userSeason(newUser.email, seasonId)), { matches: [] });
    return { user, created: true };
  });
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

/**
 * Gives the user `username` and frees their old one, unless another doc
 * already holds it. Checked and written in one transaction.
 */
export async function changeUsername(
  email: string,
  username: string
): Promise<"ok" | "taken" | "no-user"> {
  const usernameRef = adminDb.doc(paths.username(username));
  const userRef = adminDb.doc(paths.user(email));
  return adminDb.runTransaction(async (tx) => {
    const [usernameSnap, userSnap] = await tx.getAll(usernameRef, userRef);
    if (usernameSnap.exists) return "taken";
    if (!userSnap.exists) return "no-user";

    const oldUsername = (userSnap.data() as UserDoc).username;
    tx.set(usernameRef, { userId: email });
    tx.update(userRef, { username });
    if (oldUsername) {
      tx.delete(adminDb.doc(paths.username(oldUsername)));
    }
    return "ok";
  });
}

/**
 * Adds or removes `sport` from the user's sportsCaptainOf, and the captain
 * role with it (kept while they captain any sport). mRoles always keeps
 * "user". Returns false if the user doesn't exist.
 */
export async function setSportCaptain(
  email: string,
  sport: string,
  { assign, remove }: { assign?: boolean; remove?: boolean }
): Promise<boolean> {
  const userRef = adminDb.doc(paths.user(email));
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) return false;

    const stored = snap.data() as UserDoc;
    const sports = Array.isArray(stored.sportsCaptainOf) ? [...stored.sportsCaptainOf] : [];
    const roles = Array.isArray(stored.mRoles) ? [...stored.mRoles] : ["user"];

    if (assign) {
      if (!sports.includes(sport)) sports.push(sport);
      if (!roles.includes("captain")) roles.push("captain");
    }
    if (remove) {
      const idx = sports.indexOf(sport);
      if (idx !== -1) sports.splice(idx, 1);
      if (sports.length === 0) {
        const capIdx = roles.indexOf("captain");
        if (capIdx !== -1) roles.splice(capIdx, 1);
      }
    }
    if (!roles.includes("user")) roles.push("user");

    tx.update(userRef, {
      sportsCaptainOf: sports.length > 0 ? sports : FieldValue.delete(),
      mRoles: roles,
    });
    return true;
  });
}

/** All users of a college. */
export async function listCollegeUsers(college: string): Promise<UserDoc[]> {
  const snap = await adminDb
    .collection(paths.users)
    .where("college", "==", college)
    .get();
  return snap.docs.map((d) => d.data() as UserDoc);
}

/** The user-season doc, for services that change it in a transaction. */
export function userSeasonRef(
  email: string,
  seasonId: string
): DocumentReference<UserSeasonDoc> {
  return adminDb.doc(paths.userSeason(email, seasonId)) as DocumentReference<UserSeasonDoc>;
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
