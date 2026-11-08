// Users: users/{userId} (identity across seasons, global roles). userId is
// an email for accounts from before November 2026, "netid-<netid>" for
// newer ones. Old user docs also hold frozen pre-v3 fields (mRoles, college,
// sportsCaptainOf, betting totals, a username) and the name as
// firstname/lastname; reads return only the current fields (D25). A user's
// name is read from here: the copies on player docs, roster entries and MVP
// awards go stale when it changes (identityOf, displayName).
import "server-only";
import type { DocumentData, DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import type { Identity } from "@/lib/api/users";
import type { GlobalRole, UserDoc, WithId } from "@/types/firestore";
import { placeholderId } from "@/lib/netid";
import { pickFields } from "./util";

const USER_FIELDS: Record<keyof UserDoc, true> = {
  email: true, name: true, nameSource: true, netid: true,
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

/** The name to show for a user: their name, else their NetID. */
export const displayName = (user: UserDoc) => user.name ?? user.netid ?? "Unnamed";

/** Whether the user may set their own name: none yet, one they typed, or a captain's label (D-N3); Yalies' and an admin's are locked. */
export const ownsName = (user: UserDoc) => user.nameSource === "none" || user.nameSource === "self" || user.nameSource === "staff";

export function userRef(userId: string): DocumentReference {
  return adminDb.doc(paths.user(userId));
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

/** A person's identity for an API (lib/api/users Identity): `copy` names someone without an account; the email only `withEmail`. */
export function identityOf(user: UserDoc | undefined, copy: string, withEmail: boolean): Identity {
  return { name: user ? displayName(user) : copy, netid: user?.netid ?? null, ...(withEmail ? { email: user?.email ?? null } : {}) };
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
