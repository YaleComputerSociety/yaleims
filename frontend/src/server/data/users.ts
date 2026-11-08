// Users: users/{userId} (identity across seasons, global roles) and
// usernames/{username} (who holds a username). userId is an email for
// accounts from before November 2026, "netid-<netid>" for newer ones. Old
// user docs also hold frozen pre-v3 fields (mRoles, college,
// sportsCaptainOf, betting totals) and the name as firstname/lastname;
// reads return only the current fields (D25).
import "server-only";
import type { DocumentData, DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import type { GlobalRole, UserDoc, WithId } from "@/types/firestore";
import { placeholderId } from "@/lib/netid";
import { pickFields } from "./util";

const USER_FIELDS: Record<keyof UserDoc, true> = {
  email: true, name: true, nameSource: true, netid: true, username: true,
  roles: true, claimedAt: true, createdBy: true, directory: true,
};

/**
 * A stored user's current fields. Docs from before November 2026 have no
 * `name`: theirs is firstname + lastname, from Yalies at their first login.
 * A doc the migration hasn't reached yet (made by the old code during the
 * cutover) has no roles and counts as claimed.
 */
export function readUser(data: DocumentData): UserDoc {
  const user = pickFields<UserDoc>(data, USER_FIELDS);
  const oldName = `${data.firstname ?? ""} ${data.lastname ?? ""}`.trim() || null;
  const name = user.name !== undefined ? user.name : oldName;
  return {
    ...user,
    email: user.email ?? null,
    name,
    nameSource: user.nameSource ?? (name ? "yalies" : "none"),
    netid: user.netid ?? null,
    roles: user.roles ?? [],
    claimedAt: user.claimedAt ?? null,
    createdBy: user.createdBy ?? null,
    directory: user.directory ?? null,
  };
}

/** The name to show for a user: their name, else their username. */
export const displayName = (user: UserDoc) => user.name ?? user.username;

export function userRef(userId: string): DocumentReference {
  return adminDb.doc(paths.user(userId));
}

export function usernameRef(username: string): DocumentReference {
  return adminDb.doc(paths.username(username));
}

/** { count }: how many usernames have been generated. */
export function usernameCounterRef(): DocumentReference {
  return adminDb.doc(paths.usernameCounter);
}

export async function getUser(userId: string): Promise<UserDoc | null> {
  const snap = await userRef(userId).get();
  return snap.exists ? readUser(snap.data()!) : null;
}

/** The users with these ids (missing ones left out), by id. */
export async function getUsers(userIds: string[]): Promise<Map<string, UserDoc>> {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return new Map();
  const snaps = await adminDb.getAll(...ids.map(userRef));
  return new Map(snaps.filter((s) => s.exists).map((s) => [s.id, readUser(s.data()!)]));
}

/**
 * The NetID of each of these players that has one, by player id: the
 * account's recorded NetID; a placeholder (a NetID no account has yet) has none.
 */
export async function getNetids(playerIds: string[]): Promise<Map<string, string>> {
  const users = await getUsers(playerIds);
  return new Map([...users].flatMap(([id, user]) => (user.netid ? [[id, user.netid] as const] : [])));
}

/** The display names of the users with these ids (missing ones left out), by id. */
export async function getUserNames(userIds: string[]): Promise<Map<string, string>> {
  const users = await getUsers(userIds);
  return new Map([...users].map(([id, user]) => [id, displayName(user)]));
}

/** The emails of the users with these ids that have one, by id (contact links). */
export async function getEmails(userIds: string[]): Promise<Map<string, string>> {
  const users = await getUsers(userIds);
  return new Map([...users].flatMap(([id, user]) => (user.email ? [[id, user.email] as const] : [])));
}

/**
 * The users with this NetID recorded: normally one (an older, email-keyed
 * account, or users/netid-<netid>); a person signed in once while the
 * directory was down can have both until they are merged.
 */
export function usersByNetidQuery(netid: string) {
  return adminDb.collection(paths.users).where("netid", "==", netid).limit(3);
}

/**
 * Which of the users with this NetID recorded is its account: the one older
 * (email-keyed) account, else users/netid-<netid>. "conflict" for two older
 * ones (for an admin to sort out); null for none.
 */
export function holderOfNetid<T extends { id: string }>(holders: T[], netid: string): T | "conflict" | null {
  const older = holders.filter((d) => d.id !== placeholderId(netid));
  if (older.length > 1) return "conflict";
  return older[0] ?? holders[0] ?? null;
}

/** The account with this NetID recorded (holderOfNetid); null when none, or a conflict. */
export async function findUserByNetid(netid: string): Promise<WithId<UserDoc> | null> {
  const holder = holderOfNetid((await usersByNetidQuery(netid).get()).docs, netid);
  return holder && holder !== "conflict" ? { id: holder.id, ...readUser(holder.data()) } : null;
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
  userId: string,
  username: string
): Promise<"ok" | "taken" | "no-user"> {
  return adminDb.runTransaction(async (tx) => {
    const [usernameSnap, userSnap] = await tx.getAll(usernameRef(username), userRef(userId));
    if (usernameSnap.exists) return "taken";
    if (!userSnap.exists) return "no-user";

    const oldUsername = readUser(userSnap.data()!).username;
    tx.set(usernameRef(username), { userId });
    tx.update(userRef(userId), { username });
    if (oldUsername) tx.delete(usernameRef(oldUsername));
    return "ok";
  });
}
