// Users: users/{email} (identity across seasons, global roles) and
// usernames/{username} (who holds a username). Old user docs also hold frozen
// pre-v3 fields (mRoles, college, sportsCaptainOf, betting totals); reads
// return only the v3 fields (D25).
import "server-only";
import type { DocumentData, DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import type { GlobalRole, UserDoc, WithId } from "@/types/firestore";
import { pickFields } from "./util";

const USER_FIELDS: Record<keyof UserDoc, true> = {
  email: true, firstname: true, lastname: true, netid: true, username: true,
  roles: true, claimedAt: true, createdBy: true,
};

/**
 * A stored user's v3 fields. A doc the migration hasn't reached yet (made by
 * the old code during the cutover) has no roles and counts as claimed.
 */
export function readUser(data: DocumentData): UserDoc {
  const user = pickFields<UserDoc>(data, USER_FIELDS);
  return { ...user, netid: user.netid ?? null, roles: user.roles ?? [], claimedAt: user.claimedAt ?? null, createdBy: user.createdBy ?? null };
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

/** The NetIDs of the users with these emails that have one recorded, by email. */
export async function getNetids(emails: string[]): Promise<Map<string, string>> {
  const users = await getUsers([...new Set(emails)].filter((e) => !e.startsWith("guest-")));
  return new Map([...users].flatMap(([email, user]) => (user.netid ? [[email, user.netid] as const] : [])));
}

/** "First Last" of the users with these emails (missing ones left out), by email. */
export async function getUserNames(emails: string[]): Promise<Map<string, string>> {
  const users = await getUsers([...new Set(emails)]);
  return new Map([...users].map(([email, user]) => [email, `${user.firstname} ${user.lastname}`]));
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
