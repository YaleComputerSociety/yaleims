// Accounts: the user behind a Yale login and their season membership. A
// NetID resolves to one account (resolveAccount): an account from before
// November 2026 (keyed by email) when one has it, else users/netid-<netid>,
// created at the first login or, unclaimed, when a captain or supervisor
// adds the person (U10). The first visit of a season creates the season's
// player doc (D30) with the college Yalies gives. A NetID added without a
// directory match is a placeholder player "netid-<netid>": the same id as
// the account that NetID gets, or moved onto an older account (claimPlaceholders).
import "server-only";
import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import { collegeIdOfName } from "@/lib/colleges";
import { ApiError } from "@/lib/api/core";
import { placeholderId, placeholderNetid } from "@/lib/netid";
import type { JoinedVia, PlayerDoc, RosterEntryDoc, UserDoc } from "@/types/firestore";
import { logAction, type Actor } from "../data/auditLog";
import { listColleges } from "../data/colleges";
import { getPlayer, playerRef } from "../data/players";
import { listPlayerEntries, rosterEntryRef } from "../data/roster";
import { listSeasons } from "../data/seasons";
import { readUser, userRef, usernameCounterRef, usernameRef, usersByNetidQuery } from "../data/users";
import { runTransaction } from "../data/util";
import { yaliesProfile } from "../yaleLogin";

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

/** The profile fields the app reads from Yalies. */
export interface YaliesProfile {
  email: string;
  netid?: string | null;
  first_name: string;
  last_name: string;
  college?: string | null;
}

/**
 * Signs a Yale user in: their account (resolveAccount; created on the first
 * login, or claimed when a captain made it for them, U10), their membership
 * of the season and what was added under their NetID. Returns their user id.
 * Throws for a non-Yale email.
 */
export async function signIn(profile: YaliesProfile, netid: string, seasonId: string): Promise<string> {
  if (!profile.email || !profile.email.endsWith("@yale.edu")) {
    throw new Error("You must use a Yale email to sign in.");
  }
  const userId = await resolveAccount(netid, profile, null);
  const name = fullName(profile);
  await joinSeason(seasonId, userId, name, profile.college);
  await claimPlaceholders(netid, userId, name);
  return userId;
}

/**
 * The account of someone a captain or supervisor adds by NetID (U10), whom
 * Yalies knows: created unclaimed (`createdBy`) when they have none; it is
 * theirs when they first sign in. Returns its user id.
 */
export async function ensureAccount(profile: YaliesProfile, netid: string, by: Actor, seasonId: string): Promise<string> {
  return resolveAccount(netid, profile, { by, seasonId });
}

const fullName = (profile: YaliesProfile) => `${profile.first_name} ${profile.last_name}`.trim();

/**
 * The account of the person with this NetID, in this order, so an account
 * made for a NetID never takes over an older one (Execution brief):
 * 1. the one account with this NetID recorded;
 * 2. the account of the email Yalies gives for it (accounts from before
 *    November 2026 are keyed by email; its NetID is recorded now);
 * 3. users/netid-<netid>;
 * 4. none: users/netid-<netid> is created (tx.create: a concurrent creator retries and finds it).
 * Two accounts with the NetID, or an email account recorded with another
 * NetID, are refused (409) for an admin to sort out. Read and written in one
 * transaction with the username counter.
 *
 * A sign-in (`createdFor` null) claims the account and takes the name from
 * Yalies unless an admin set one; someone else's add only records a missing NetID.
 */
async function resolveAccount(
  netid: string,
  profile: YaliesProfile | null,
  /** Someone else making the account (logged in this season); null: their own sign-in. */
  createdFor: { by: Actor; seasonId: string } | null
): Promise<string> {
  const signingIn = createdFor === null;
  const name = profile ? fullName(profile) || null : null;
  return runTransaction(async (tx) => {
    const holders = (await tx.get(usersByNetidQuery(netid))).docs;
    if (holders.length > 1) throw new ApiError("conflict", "More than one account has this NetID. Ask an admin to fix it.");
    let snap: DocumentSnapshot | null = holders[0] ?? null;
    if (!snap && profile?.email) {
      const byEmail = await tx.get(userRef(profile.email));
      if (byEmail.exists) snap = byEmail;
    }
    if (!snap) {
      const own = await tx.get(userRef(placeholderId(netid)));
      if (own.exists) snap = own;
    }

    if (snap) {
      const user = readUser(snap.data()!);
      if (user.netid && user.netid !== netid) {
        throw new ApiError("conflict", "This person's account has another NetID. Ask an admin to fix it.");
      }
      const changes: Partial<Record<keyof UserDoc, unknown>> = {};
      if (!user.netid) changes.netid = netid;
      if (signingIn) {
        if (!user.claimedAt) changes.claimedAt = FieldValue.serverTimestamp();
        if (name && user.nameSource !== "admin" && (user.name !== name || user.nameSource !== "yalies")) {
          changes.name = name;
          changes.nameSource = "yalies";
        }
        if (profile?.email && !user.email) changes.email = profile.email;
      }
      if (Object.keys(changes).length) tx.update(snap.ref, changes);
      return snap.id;
    }

    const userId = placeholderId(netid);
    const ref = userRef(userId);
    const n = ((await tx.get(usernameCounterRef())).data()?.count || 0) + 1;
    let username = generateUsername(n);
    const taken = (await tx.get(usernameRef(username))).exists;
    if (taken) username = "Anonymous";

    tx.set(usernameCounterRef(), { count: n }, { merge: true });
    if (!taken) tx.set(usernameRef(username), { userId });
    tx.create(ref, {
      email: profile?.email ?? null,
      name,
      nameSource: name ? "yalies" : "none",
      netid,
      username,
      roles: [],
      claimedAt: signingIn ? FieldValue.serverTimestamp() : null,
      createdBy: createdFor?.by.userId ?? null,
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
    return userId;
  });
}

/** Records the NetID of a user who has none yet (signed in before NetIDs were kept). */
export async function recordNetid(userId: string, netid: string): Promise<void> {
  await userRef(userId).update({ netid });
}

/**
 * The person's membership of the season, created on their first visit of it
 * (D30) with the college named `collegeName` (from Yalies; null if it names
 * none of the season's colleges). A placeholder ("netid-<netid>") gets the
 * account of that id as its user when one exists; while another account
 * holds the NetID, making one is refused (a stale add must retry with it).
 */
export async function joinSeason(
  seasonId: string,
  playerId: string,
  name: string,
  collegeName: unknown,
  joinedVia: JoinedVia = "login"
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
 * A signed-in student's membership of a season they haven't joined yet
 * (D30), with the college Yalies gives now: a college is never carried over
 * from an earlier season (account plan, decision 5). Yalies not knowing them
 * joins them without a college; Yalies unreachable leaves it for a later visit.
 */
export async function joinSeasonFromDirectory(seasonId: string, userId: string, netid: string, name: string): Promise<void> {
  if (await getPlayer(seasonId, userId)) return;
  let profile: YaliesProfile | null;
  try {
    profile = await yaliesProfile(netid);
  } catch {
    return;
  }
  await joinSeason(seasonId, userId, name, profile?.college ?? null);
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
