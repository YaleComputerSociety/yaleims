// Accounts: the user behind a Yale login and their season membership. A
// NetID resolves to one account (readAccount): an account from before
// November 2026 (keyed by email) when one has it, else users/netid-<netid>,
// created at the first login or, unclaimed, when a captain or supervisor
// adds the person (U10, services/roster.ts, in the add's own transaction).
// Sign-in and staff adds look the NetID up in the directory
// (server/directory.ts); the Profile's retry and a season's first visit do
// too, at most once per cooldown (users/{id}.directory, which every lookup
// sets). Each field the directory gives is applied on its own. A season's
// player doc (D30) takes its college from the directory, never from last
// season or a game side. When the directory later links a NetID to an older
// account, what was made under "netid-<netid>" moves onto it (claimPlaceholders).
import "server-only";
import { FieldValue, Timestamp, type DocumentSnapshot, type Query, type Transaction } from "firebase-admin/firestore";
import { assignmentsOf } from "@/lib/attendance";
import { collegeIdOfName } from "@/lib/colleges";
import { ApiError } from "@/lib/api/core";
import { placeholderId, placeholderNetid } from "@/lib/netid";
import type { CollegeAssignment, DirectoryOutcome, JoinedVia, PlayerDoc, RosterEntryDoc, UserDoc } from "@/types/firestore";
import { logAction, type Actor } from "../data/auditLog";
import { listColleges } from "../data/colleges";
import { getPlayer, playerRef } from "../data/players";
import { mvpsRef } from "../data/mvps";
import { playerEntriesQuery, rosterEntryRef } from "../data/roster";
import { getCurrentSeasonId, listSeasons } from "../data/seasons";
import { collegeTeamsRef } from "../data/teams";
import { displayName, holderOfNetid, readUser, userRef, usernameCounterRef, usernameRef, usersByNetidQuery } from "../data/users";
import { runTransaction } from "../data/util";
import { lookUpNetid, type DirectoryResult } from "../directory";

// Generated usernames: adjective + noun + the username counter, e.g.
// "NobleFalcon1042". Some nouns repeat; kept as they were.
const ADJECTIVES = [
  "Swift", "Bold", "Clever", "Happy", "Brave", "Fierce", "Gentle", "Mighty",
  "Charming", "Lucky", "Fearless", "Noble", "Playful", "Quick", "Witty",
  "Serene", "Vivid", "Graceful", "Bright", "Silent", "Eager", "Calm",
  "Dynamic", "Friendly", "Humble", "Jolly", "Keen", "Loyal", "Patient",
  "Powerful", "Radiant", "Sharp", "Sturdy", "Valiant", "Wise", "Zealous",
  "Agile", "Cheerful", "Daring", "Elegant", "Fearsome", "Gleeful", "Heroic",
  "Joyful", "Kind", "Lively", "Modest", "Peaceful", "Resilient", "Spirited",
  "Strong", "Thoughtful", "Vibrant", "Warm", "Zesty",
];

const NOUNS = [
  "Tiger", "Cloud", "Eagle", "Phoenix", "Wave", "Lion", "Bear", "Falcon",
  "River", "Mountain", "Sky", "Wolf", "Sun", "Moon", "Star", "Forest", "Ocean",
  "Hawk", "Falcon", "Stream", "Glacier", "Thunder", "Comet", "Dolphin",
  "Breeze", "Shadow", "Flame", "Blaze", "Meadow", "Canyon", "Galaxy", "Pebble",
  "Raven", "Snow", "Storm", "Tornado", "Valley", "Whale", "Zephyr", "Aurora",
  "Brook", "Falcon", "Lynx", "Meteor", "Puma", "Quasar", "Rain", "Sand",
  "Tide", "Vortex", "Wind", "Zenith", "Orca", "Jaguar", "Dragonfly",
];

function generateUsername(n: number): string {
  const pick = (words: string[]) => words[Math.floor(Math.random() * words.length)];
  return `${pick(ADJECTIVES)}${pick(NOUNS)}${n}`;
}

/**
 * Signs a Yale user in once CAS has vouched for `netid`: looks the NetID up
 * in the directory, then their account (readAccount: created on the first
 * login, or claimed when a captain made it for them, U10), their membership
 * of the season (none without one) and what was added under their NetID.
 * Nothing the directory lacks stops the sign-in. Returns their user id.
 */
export async function signIn(netid: string, seasonId: string | null): Promise<string> {
  const found = await lookUpNetid(netid);
  const { userId, name } = await runTransaction(async (tx) =>
    writeAccount(tx, await readAccount(tx, netid, found), found, null)
  );
  if (seasonId) await enterSeason(seasonId, userId, found);
  await claimPlaceholders(netid, userId, name);
  return userId;
}

/** What readAccount found: the person's account, or what a new one needs. */
export type AccountRead =
  | { netid: string; existing: DocumentSnapshot }
  | { netid: string; existing: null; counter: number; username: string; usernameTaken: boolean };

/**
 * Reads, in `tx`, the account of the person with this NetID, in this order,
 * so an account made for a NetID never takes over an older one (Execution
 * brief):
 * 1. the one older (email-keyed) account with this NetID recorded;
 * 2. the older account of the email the directory gives (its NetID is recorded by writeAccount);
 * 3. users/netid-<netid>;
 * 4. none: what writeAccount needs to create users/netid-<netid> (tx.create:
 *    a concurrent creator retries and finds it), with a generated username.
 * Two older accounts with the NetID, or one recorded with another NetID, are
 * refused (409) for an admin to sort out. Reads only, so a caller can read
 * everything else it needs before any write (services/roster.ts).
 */
export async function readAccount(tx: Transaction, netid: string, found: DirectoryResult): Promise<AccountRead> {
  const holder = holderOfNetid((await tx.get(usersByNetidQuery(netid))).docs, netid);
  if (holder === "conflict") throw new ApiError("conflict", "More than one account has this NetID. Ask an admin to fix it.");
  let snap: DocumentSnapshot | null = holder?.id === placeholderId(netid) ? null : holder;
  const email = found.person?.email;
  if (!snap && email) {
    const byEmail = await tx.get(userRef(email));
    if (byEmail.exists) snap = byEmail;
  }
  snap ??= holder;
  if (!snap) {
    const own = await tx.get(userRef(placeholderId(netid)));
    if (own.exists) snap = own;
  }
  if (snap) {
    const recorded = readUser(snap.data()!).netid;
    if (recorded && recorded !== netid) {
      throw new ApiError("conflict", "This person's account has another NetID. Ask an admin to fix it.");
    }
    return { netid, existing: snap };
  }
  const counter = ((await tx.get(usernameCounterRef())).data()?.count || 0) + 1;
  const username = generateUsername(counter);
  const usernameTaken = (await tx.get(usernameRef(username))).exists;
  return { netid, existing: null, counter, username, usernameTaken };
}

/**
 * Writes what readAccount found: the directory's fields on the account
 * (directoryChanges) and its NetID; a sign-in (`createdFor` null) claims it.
 * A new account is created unclaimed when someone else makes it (logged in
 * their season). Returns the account's id and display name.
 */
export function writeAccount(
  tx: Transaction,
  read: AccountRead,
  found: DirectoryResult,
  /** Someone else making the account (logged in this season); null: their own sign-in. */
  createdFor: { by: Actor; seasonId: string } | null
): { userId: string; name: string } {
  const signingIn = createdFor === null;
  if (read.existing) {
    const user = readUser(read.existing.data()!);
    const changes = directoryChanges(user, found);
    if (!user.netid) changes.netid = read.netid;
    if (signingIn && !user.claimedAt) changes.claimedAt = FieldValue.serverTimestamp();
    tx.update(read.existing.ref, changes);
    return { userId: read.existing.id, name: displayName({ ...user, ...(changes as Partial<UserDoc>) }) };
  }

  const userId = placeholderId(read.netid);
  const ref = userRef(userId);
  const username = read.usernameTaken ? "Anonymous" : read.username;
  tx.set(usernameCounterRef(), { count: read.counter }, { merge: true });
  if (!read.usernameTaken) tx.set(usernameRef(username), { userId });
  const name = found.person?.name ?? null;
  tx.create(ref, {
    email: found.person?.email ?? null,
    name,
    nameSource: name ? "yalies" : "none",
    netid: read.netid,
    username,
    roles: [],
    claimedAt: signingIn ? FieldValue.serverTimestamp() : null,
    createdBy: createdFor?.by.userId ?? null,
    directory: directoryState(found),
  } satisfies Record<keyof UserDoc, unknown>);
  if (createdFor) {
    logAction(tx, createdFor.seasonId, {
      actor: createdFor.by,
      action: "createAccountFor",
      params: { userId, netid: read.netid },
      changed: [],
      created: [ref],
    });
  }
  return { userId, name: name ?? username };
}

/** How long until the next lookup: soon after a complete answer or an outage, longer after an incomplete one. */
const COOLDOWN_MS: Record<DirectoryOutcome, number> = {
  found: 60_000,
  unavailable: 60_000,
  partial: 15 * 60_000,
  "not-found": 15 * 60_000,
};

/** users/{id}.directory after a lookup: its outcome, and the cooldown that starts now. */
function directoryState(found: DirectoryResult) {
  const now = Date.now();
  return { outcome: found.outcome, checkedAt: Timestamp.fromMillis(now), nextAt: Timestamp.fromMillis(now + COOLDOWN_MS[found.outcome]) };
}

/**
 * What a directory lookup changes on a user: the lookup's state; the name,
 * unless an admin set it (Yalies' name replaces one they typed, and locks
 * it); the email when none is known. Each field on its own: a missing one
 * changes nothing.
 */
function directoryChanges(user: UserDoc, found: DirectoryResult): Record<string, unknown> {
  const changes: Record<string, unknown> = { directory: directoryState(found) };
  const { name, email } = found.person ?? {};
  if (name && user.nameSource !== "admin" && (user.name !== name || user.nameSource !== "yalies")) {
    changes.name = name;
    changes.nameSource = "yalies";
  }
  if (email && !user.email) changes.email = email;
  return changes;
}

/**
 * Looks the user's NetID up again (Profile → "Check Yalies again") and
 * applies what it finds, college included. At most once per cooldown: the
 * slot is claimed in a transaction before the call, so a double click or a
 * second tab makes one call; an early retry is refused (429, with retryAt).
 */
export async function refreshFromDirectory(userId: string, netid: string, seasonId: string | null): Promise<DirectoryOutcome> {
  const result = await lookUpAgain(userId, netid, seasonId);
  if (!result) throw new ApiError("not-found", "No account for this login yet.");
  if ("retryAt" in result) {
    const minutes = Math.max(1, Math.ceil((result.retryAt.getTime() - Date.now()) / 60_000));
    throw new ApiError("rate-limited", `Yalies was checked moments ago. Try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`, {
      retryAt: result.retryAt.toISOString(),
    });
  }
  return result.outcome;
}

/**
 * A signed-in student's membership of a season they haven't joined yet
 * (D30), with the college the directory gives now: a college is never
 * carried over from an earlier season (account plan, decision 5). Within the
 * cooldown, or with the directory down, they join at a later visit.
 */
export async function joinSeasonOnVisit(seasonId: string, userId: string, netid: string): Promise<void> {
  if (await getPlayer(seasonId, userId)) return;
  await lookUpAgain(userId, netid, seasonId);
}

/**
 * Claims the user's lookup slot, looks up, applies; or, within the
 * cooldown, when the next may run; null without an account.
 */
async function lookUpAgain(
  userId: string,
  netid: string,
  seasonId: string | null
): Promise<{ outcome: DirectoryOutcome } | { retryAt: Date } | null> {
  const ref = userRef(userId);
  const claim = await runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return "no-account";
    const { directory } = readUser(snap.data()!);
    if (directory && directory.nextAt.toMillis() > Date.now()) return directory.nextAt.toDate();
    // The slot: held as if the directory were down, until the answer sets the real cooldown.
    const nextAt = Timestamp.fromMillis(Date.now() + COOLDOWN_MS.unavailable);
    tx.update(ref, { directory: { outcome: directory?.outcome ?? null, checkedAt: directory?.checkedAt ?? null, nextAt } });
    return "claimed";
  });
  if (claim === "no-account") return null;
  if (claim !== "claimed") return { retryAt: claim };
  const found = await lookUpNetid(netid);
  await runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) tx.update(ref, directoryChanges(readUser(snap.data()!), found));
  });
  if (seasonId) await enterSeason(seasonId, userId, found);
  return { outcome: found.outcome };
}

/**
 * The person's membership of the season with the college the directory
 * gives (D30), on a visit: see writeSeasonPlayer. With the directory down,
 * nothing changes.
 */
async function enterSeason(seasonId: string, userId: string, found: DirectoryResult): Promise<void> {
  if (found.outcome === "unavailable") return;
  const directoryCollege = collegeIdOfName(await listColleges(seasonId), found.person?.college);
  const ref = playerRef(seasonId, userId);
  await runTransaction(async (tx) => {
    const [playerSnap, userSnap] = await tx.getAll(ref, userRef(userId));
    const name = userSnap.exists ? displayName(readUser(userSnap.data()!)) : userId;
    writeSeasonPlayer(tx, seasonId, userId, playerSnap.data() as PlayerDoc | undefined, directoryCollege, { name, joinedVia: "login" });
  });
}

/**
 * A season player's college once the directory names `directoryCollege`
 * (null: none of the season's): an assigned college stays (only an admin
 * changes it, services/affiliation.ts); an unassigned one takes the
 * directory's, unless an admin cleared it. A game side never sets one.
 */
export function collegeAfterLookup(player: PlayerDoc | undefined, directoryCollege: string | null): string | null {
  if (player?.collegeId) return player.collegeId;
  if (player?.collegeHistory?.at(-1)?.source === "admin") return null;
  return directoryCollege;
}

/**
 * Writes `userId`'s membership of the season after a lookup: created when
 * they have none (D30; unassigned when the directory names no college);
 * given the directory's college per collegeAfterLookup; a placeholder
 * player ("netid-<netid>", userId null) gets its account as its user.
 */
export function writeSeasonPlayer(
  tx: Transaction,
  seasonId: string,
  userId: string,
  player: PlayerDoc | undefined,
  directoryCollege: string | null,
  joining: { name: string; joinedVia: JoinedVia }
): void {
  const ref = playerRef(seasonId, userId);
  const collegeId = collegeAfterLookup(player, directoryCollege);
  const assignment: CollegeAssignment = { collegeId, source: "yalies", since: Timestamp.now() };
  if (!player) {
    tx.create(ref, {
      seasonId,
      collegeId,
      collegeHistory: collegeId ? [assignment] : [],
      name: joining.name,
      userId,
      roles: [],
      joinedAt: FieldValue.serverTimestamp(),
      joinedVia: joining.joinedVia,
    });
    return;
  }
  const changes: Record<string, unknown> = {};
  if (collegeId !== player.collegeId) Object.assign(changes, { collegeId, collegeHistory: FieldValue.arrayUnion(assignment) });
  if (player.userId !== userId) Object.assign(changes, { userId, name: joining.name });
  if (Object.keys(changes).length > 0) tx.update(ref, changes);
}

/**
 * Sets the name the user typed, while it may be theirs to set: no name yet,
 * or one they typed (the directory's and an admin's are locked). The
 * season's player doc, which copies it, changes with it.
 */
export async function changeName(userId: string, name: string, seasonId: string | null): Promise<"ok" | "locked" | "no-user"> {
  return runTransaction(async (tx) => {
    const [userSnap, playerSnap] = await tx.getAll(userRef(userId), ...(seasonId ? [playerRef(seasonId, userId)] : []));
    if (!userSnap.exists) return "no-user";
    if (!["none", "self"].includes(readUser(userSnap.data()!).nameSource)) return "locked";
    tx.update(userSnap.ref, { name, nameSource: "self" });
    if (playerSnap?.exists) tx.update(playerSnap.ref, { name });
    return "ok";
  });
}

/** Records the NetID of a user who has none yet (signed in before NetIDs were kept). */
export async function recordNetid(userId: string, netid: string): Promise<void> {
  await userRef(userId).update({ netid });
}

/**
 * Folds what was made under `netid` before its owner's account was known
 * into the account `userId`. "netid-<netid>" is the id of the account a
 * NetID gets when no older account has it, and of a placeholder player (a
 * NetID added without an account, before November 2026):
 * - `userId` is that id: its player docs get it as their user;
 * - `userId` is an older (email-keyed) account the directory has now linked
 *   to the NetID, after a sign-in or staff add made users/netid-<netid>
 *   while it couldn't (Execution brief "Identity"): per season, in one
 *   transaction (foldSeason), the older account takes over everything under
 *   the other id; then that account goes (foldAccount).
 * Safe to repeat. Returns how many roster entries moved.
 */
export async function claimPlaceholders(netid: string, userId: string, name: string): Promise<number> {
  const placeholder = placeholderId(netid);
  let moved = 0;
  for (const { id: seasonId } of await listSeasons()) {
    const placeholderRef = playerRef(seasonId, placeholder);
    if (placeholder === userId) {
      await runTransaction(async (tx) => {
        const player = (await tx.get(placeholderRef)).data();
        if (player && player.userId !== userId) tx.update(placeholderRef, { userId, name });
      });
      continue;
    }
    if (!(await placeholderRef.get()).exists) continue;
    moved += await runTransaction((tx) => foldSeason(tx, seasonId, placeholder, userId, name));
  }
  if (placeholder !== userId) await foldAccount(placeholder, userId);
  return moved;
}

/**
 * Moves a season's player `from` onto `to` (R05): the roster entries
 * (mergeEntries with an entry `to` has on the same game), the captaincies,
 * the MVP awards (one per college and week: a duplicate goes, decision 4b)
 * and the player doc when `to` has none (else `to`'s college stands).
 * Audit-logged. Returns how many entries moved.
 */
async function foldSeason(tx: Transaction, seasonId: string, from: string, to: string, name: string): Promise<number> {
  const [fromSnap, toSnap] = await tx.getAll(playerRef(seasonId, from), playerRef(seasonId, to));
  const source = fromSnap.data() as PlayerDoc | undefined;
  if (!source) return 0;
  const entries = (await tx.get(playerEntriesQuery(seasonId, from))).docs;
  const targets = entries.map((e) => rosterEntryRef(seasonId, e.data().matchId, to));
  const targetSnaps = targets.length ? await tx.getAll(...targets) : [];
  // Captaincies and awards are given in the player's college of the time.
  const colleges = [...new Set([source.collegeId, ...assignmentsOf(source).map((a) => a.collegeId)])].filter((c) => c !== null);
  const each = async <T>(query: (collegeId: string) => Query<T>) =>
    (await Promise.all(colleges.map((c) => tx.get(query(c))))).flatMap((q) => q.docs);
  const teams = await each((c) => collegeTeamsRef(seasonId, c).where("captainIds", "array-contains", from));
  const awards = await each((c) => mvpsRef(seasonId, c).where("playerId", "==", from));
  const ownAwards = await each((c) => mvpsRef(seasonId, c).where("playerId", "==", to));

  entries.forEach((snap, i) => {
    const existing = targetSnaps[i].data() as RosterEntryDoc | undefined;
    tx.set(targets[i], { ...mergeEntries(existing, snap.data()), playerId: to, name });
    tx.delete(snap.ref);
  });
  for (const team of teams) {
    const captainIds = team.data().captainIds.filter((id) => id !== from);
    tx.update(team.ref, { captainIds: captainIds.includes(to) ? captainIds : [...captainIds, to] });
  }
  for (const award of awards) {
    const { collegeId, week } = award.data();
    const duplicate = ownAwards.some((a) => a.data().collegeId === collegeId && a.data().week === week);
    if (duplicate) tx.delete(award.ref);
    else tx.update(award.ref, { playerId: to, name });
  }
  if (!toSnap.exists) tx.create(playerRef(seasonId, to), { ...source, name, userId: to });
  tx.delete(fromSnap.ref);
  logAction(tx, seasonId, {
    actor: { userId: to, roles: ["user"] },
    action: "claimPlaceholder",
    params: { netid: placeholderNetid(from), userId: to },
    changed: [fromSnap, ...entries, ...targetSnaps.filter((s) => s.exists), ...teams, ...awards],
    created: [...targets.filter((_, i) => !targetSnaps[i].exists), ...(toSnap.exists ? [] : [playerRef(seasonId, to)])],
  });
  return entries.length;
}

/**
 * One person's two entries on a game, as one: the kept entry (when there
 * is one), with the moved entry's presence when only it was marked present
 * and its captain's call when the kept one has none.
 */
function mergeEntries(kept: RosterEntryDoc | undefined, moved: RosterEntryDoc): RosterEntryDoc {
  if (!kept) return moved;
  const { present, presentBy, presentAt, captainStatus, captainBy, captainAt } = moved;
  return {
    ...kept,
    ...(present && !kept.present ? { present, presentBy, presentAt } : {}),
    ...(kept.captainStatus === null ? { captainStatus, captainBy, captainAt } : {}),
  };
}

/**
 * Deletes the account `accountId`, folded into `intoId`, with its username;
 * one that holds a global role stays (an admin's call). Logged in the
 * current season.
 */
async function foldAccount(accountId: string, intoId: string): Promise<void> {
  const seasonId = await getCurrentSeasonId();
  await runTransaction(async (tx) => {
    const snap = await tx.get(userRef(accountId));
    if (!snap.exists) return;
    const account = readUser(snap.data()!);
    if (account.roles.length > 0) return;
    const usernameSnap = account.username ? await tx.get(usernameRef(account.username)) : null;
    tx.delete(snap.ref);
    if (usernameSnap?.data()?.userId === accountId) tx.delete(usernameSnap.ref);
    if (seasonId) {
      logAction(tx, seasonId, {
        actor: { userId: intoId, roles: ["user"] },
        action: "foldAccount",
        params: { userId: accountId, into: intoId },
        changed: [snap, ...(usernameSnap?.exists ? [usernameSnap] : [])],
      });
    }
  });
}
