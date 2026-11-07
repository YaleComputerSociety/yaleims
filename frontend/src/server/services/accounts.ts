// Accounts: the user behind a Yale login and their season membership. A
// NetID resolves to one account (resolveAccount): an account from before
// November 2026 (keyed by email) when one has it, else users/netid-<netid>,
// created at the first login or, unclaimed, when a captain or supervisor
// adds the person (U10). Sign-in and staff adds look the NetID up in the
// directory (server/directory.ts); the Profile's retry and a season's first
// visit do too, at most once per cooldown (users/{id}.directory, which every
// lookup sets). Each field the directory gives is applied on its own. The
// first visit of a season creates the season's player doc (D30) with the
// college the directory gives, never last season's. A NetID added without a
// directory match is a placeholder player "netid-<netid>": the same id as
// the account that NetID gets, or moved onto an older account (claimPlaceholders).
import "server-only";
import { FieldValue, Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import { collegeIdOfName } from "@/lib/colleges";
import { ApiError } from "@/lib/api/core";
import { placeholderId, placeholderNetid } from "@/lib/netid";
import type { CollegeAssignment, DirectoryOutcome, JoinedVia, PlayerDoc, RosterEntryDoc, UserDoc } from "@/types/firestore";
import { logAction, type Actor } from "../data/auditLog";
import { listColleges } from "../data/colleges";
import { getPlayer, playerRef } from "../data/players";
import { listPlayerEntries, rosterEntryRef } from "../data/roster";
import { listSeasons } from "../data/seasons";
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
 * in the directory, then their account (resolveAccount: created on the first
 * login, or claimed when a captain made it for them, U10), their membership
 * of the season (none without one) and what was added under their NetID.
 * Nothing the directory lacks stops the sign-in. Returns their user id.
 */
export async function signIn(netid: string, seasonId: string | null): Promise<string> {
  const found = await lookUpNetid(netid);
  const { userId, name } = await resolveAccount(netid, found, null);
  if (seasonId) await enterSeason(seasonId, userId, found);
  await claimPlaceholders(netid, userId, name);
  return userId;
}

/**
 * The account of someone a captain or supervisor adds by NetID (U10), whom
 * the directory knows: created unclaimed (`createdBy`) when they have none;
 * it is theirs when they first sign in. Returns its user id.
 */
export async function ensureAccount(found: DirectoryResult, netid: string, by: Actor, seasonId: string): Promise<string> {
  return (await resolveAccount(netid, found, { by, seasonId })).userId;
}

/**
 * The account of the person with this NetID, in this order, so an account
 * made for a NetID never takes over an older one (Execution brief):
 * 1. the one older (email-keyed) account with this NetID recorded;
 * 2. the older account of the email the directory gives (its NetID is recorded now);
 * 3. users/netid-<netid>;
 * 4. none: users/netid-<netid> is created (tx.create: a concurrent creator retries and finds it).
 * Two older accounts with the NetID, or one recorded with another NetID, are
 * refused (409) for an admin to sort out. The directory's fields are applied
 * (directoryChanges) and a sign-in (`createdFor` null) claims the account.
 * Read and written in one transaction with the username counter. Returns the
 * account's id and display name.
 */
async function resolveAccount(
  netid: string,
  found: DirectoryResult,
  /** Someone else making the account (logged in this season); null: their own sign-in. */
  createdFor: { by: Actor; seasonId: string } | null
): Promise<{ userId: string; name: string }> {
  const signingIn = createdFor === null;
  const email = found.person?.email ?? null;
  return runTransaction(async (tx) => {
    const holder = holderOfNetid((await tx.get(usersByNetidQuery(netid))).docs, netid);
    if (holder === "conflict") throw new ApiError("conflict", "More than one account has this NetID. Ask an admin to fix it.");
    let snap: DocumentSnapshot | null = holder?.id === placeholderId(netid) ? null : holder;
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
      const user = readUser(snap.data()!);
      if (user.netid && user.netid !== netid) {
        throw new ApiError("conflict", "This person's account has another NetID. Ask an admin to fix it.");
      }
      const changes = directoryChanges(user, found);
      if (!user.netid) changes.netid = netid;
      if (signingIn && !user.claimedAt) changes.claimedAt = FieldValue.serverTimestamp();
      tx.update(snap.ref, changes);
      return { userId: snap.id, name: displayName({ ...user, ...(changes as Partial<UserDoc>) }) };
    }

    const userId = placeholderId(netid);
    const ref = userRef(userId);
    const n = ((await tx.get(usernameCounterRef())).data()?.count || 0) + 1;
    let username = generateUsername(n);
    const taken = (await tx.get(usernameRef(username))).exists;
    if (taken) username = "Anonymous";

    tx.set(usernameCounterRef(), { count: n }, { merge: true });
    if (!taken) tx.set(usernameRef(username), { userId });
    const name = found.person?.name ?? null;
    tx.create(ref, {
      email,
      name,
      nameSource: name ? "yalies" : "none",
      netid,
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
        params: { userId, netid },
        changed: [],
        created: [ref],
      });
    }
    return { userId, name: name ?? username };
  });
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
 * gives (D30): created on their first visit (unassigned when the directory
 * names no college of the season); an unassigned one gets the college once
 * the directory gives it, unless an admin cleared it. A college other than
 * the assigned one changes nothing (an admin's call). With the directory
 * down, nothing changes.
 */
async function enterSeason(seasonId: string, userId: string, found: DirectoryResult): Promise<void> {
  if (found.outcome === "unavailable") return;
  const collegeId = collegeIdOfName(await listColleges(seasonId), found.person?.college);
  const ref = playerRef(seasonId, userId);
  await runTransaction(async (tx) => {
    const [playerSnap, userSnap] = await tx.getAll(ref, userRef(userId));
    const player = playerSnap.data() as PlayerDoc | undefined;
    const assignment: CollegeAssignment = { collegeId, source: "yalies", since: Timestamp.now() };
    if (!player) {
      tx.create(ref, {
        seasonId,
        collegeId,
        collegeHistory: collegeId ? [assignment] : [],
        name: userSnap.exists ? displayName(readUser(userSnap.data()!)) : userId,
        userId,
        roles: [],
        joinedAt: FieldValue.serverTimestamp(),
        joinedVia: "login",
      });
    } else if (!player.collegeId && collegeId && player.collegeHistory?.at(-1)?.source !== "admin") {
      tx.update(ref, { collegeId, collegeHistory: FieldValue.arrayUnion(assignment) });
    }
  });
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
 * A membership made for someone a captain or supervisor adds (U10), with
 * the college named `collegeName`. A placeholder ("netid-<netid>") gets the
 * account of that id as its user when one exists; while another account
 * holds the NetID, making one is refused (a stale add must retry with it).
 */
export async function joinSeason(
  seasonId: string,
  playerId: string,
  name: string,
  collegeName: unknown,
  joinedVia: JoinedVia
): Promise<Pick<PlayerDoc, "collegeId" | "roles">> {
  const colleges = await listColleges(seasonId);
  const ref = playerRef(seasonId, playerId);
  return runTransaction(async (tx) => {
    const existing = (await tx.get(ref)).data();
    if (existing) return existing;
    let userId: string | null = playerId;
    const netid = placeholderNetid(playerId);
    if (netid) {
      const [holders, account] = await Promise.all([tx.get(usersByNetidQuery(netid)), tx.get(userRef(playerId))]);
      if (holders.docs.some((d) => d.id !== playerId)) {
        throw new ApiError("conflict", "This NetID now has a verified account. Retry adding the player.");
      }
      userId = account.exists ? playerId : null;
    }
    const collegeId = collegeIdOfName(colleges, collegeName);
    tx.create(ref, {
      seasonId,
      collegeId,
      name,
      userId,
      roles: [],
      joinedAt: FieldValue.serverTimestamp(),
      joinedVia,
    });
    return { collegeId, roles: [] };
  });
}

/**
 * The placeholder players of `netid` (one per season at most, made when the
 * NetID was added without a directory match) become the account `userId`'s.
 * An account with the placeholder's own id ("netid-<netid>") simply becomes
 * the player's user. Any other account (from before November 2026) takes
 * over its roster entries (merged with an entry it already has on the same
 * game: present if either was), the season's player doc when it has none,
 * and the placeholder goes. Audit-logged. Returns how many entries moved.
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
    const entries = await listPlayerEntries(seasonId, placeholder);
    moved += await runTransaction(async (tx) => {
      const sources = entries.map((e) => rosterEntryRef(seasonId, e.matchId, placeholder));
      const targets = entries.map((e) => rosterEntryRef(seasonId, e.matchId, userId));
      const [placeholderSnap, playerSnap] = await tx.getAll(placeholderRef, playerRef(seasonId, userId));
      const snaps = entries.length ? await tx.getAll(...sources, ...targets) : [];
      if (!placeholderSnap.exists) return 0;
      const sourceSnaps = snaps.slice(0, entries.length);
      const targetSnaps = snaps.slice(entries.length);
      sourceSnaps.forEach((snap, i) => {
        const entry = snap.data() as RosterEntryDoc | undefined;
        if (!entry) return;
        const existing = targetSnaps[i].data() as RosterEntryDoc | undefined;
        tx.set(targets[i], {
          ...(existing ?? entry),
          playerId: userId,
          name,
          present: !!(existing?.present || entry.present),
          captainStatus: existing?.captainStatus ?? entry.captainStatus,
        });
        tx.delete(sources[i]);
      });
      if (!playerSnap.exists) {
        tx.create(playerRef(seasonId, userId), { ...(placeholderSnap.data() as PlayerDoc), name, userId });
      }
      tx.delete(placeholderRef);
      const actor: Actor = { userId, roles: ["user"] };
      logAction(tx, seasonId, {
        actor,
        action: "claimPlaceholder",
        params: { netid, userId },
        changed: [placeholderSnap, ...sourceSnaps, ...targetSnaps.filter((s) => s.exists)],
        created: [...targets.filter((_, i) => !targetSnaps[i].exists), ...(playerSnap.exists ? [] : [playerRef(seasonId, userId)])],
      });
      return sourceSnaps.filter((s) => s.exists).length;
    });
  }
  return moved;
}
