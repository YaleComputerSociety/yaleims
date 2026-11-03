// Accounts: the user behind a Yale login and their season membership. The
// first login creates users/{email} with a generated username and the NetID
// (recorded for users from before, at their next login or visit); a captain
// or supervisor adding someone by NetID creates it for them, unclaimed (U10).
// The first visit of a season creates the season's player doc (D30) with the
// college Yalies gave. A NetID added without a directory match is a
// placeholder player until that person's account appears (claimPlaceholders).
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { collegeIdOfName } from "@/lib/colleges";
import { placeholderId, placeholderNetid } from "@/lib/netid";
import type { JoinedVia, PlayerDoc, RosterEntryDoc } from "@/types/firestore";
import { logAction, type Actor } from "../data/auditLog";
import { listColleges } from "../data/colleges";
import { playerRef } from "../data/players";
import { listPlayerEntries, rosterEntryRef } from "../data/roster";
import { listSeasons } from "../data/seasons";
import { readUser, userRef, usernameCounterRef, usernameRef } from "../data/users";
import { runTransaction } from "../data/util";

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
 * Signs a Yale user in: creates their account on the first login (or claims
 * one a captain made for them, U10) and their membership of the season.
 * Throws for a non-Yale email.
 */
export async function signIn(profile: YaliesProfile, netid: string, seasonId: string): Promise<void> {
  if (!profile.email || !profile.email.endsWith("@yale.edu")) {
    throw new Error("You must use a Yale email to sign in.");
  }
  await getOrCreateUser(profile, netid, null);
  const name = `${profile.first_name} ${profile.last_name}`.trim();
  await joinSeason(seasonId, profile.email, name, profile.college);
  await claimPlaceholders(netid, profile.email, name);
}

/**
 * The account of someone a captain or supervisor adds by NetID (U10): found
 * in Yalies, created unclaimed (`createdBy`) when they have none; it is
 * theirs when they first sign in.
 */
export async function ensureAccount(profile: YaliesProfile, netid: string, by: Actor, seasonId: string): Promise<void> {
  await getOrCreateUser(profile, netid, { by, seasonId });
}

/**
 * The user, created when missing: a generated username from the next value
 * of the username counter ("Anonymous" if that one is taken). Counter,
 * username and user change in one transaction.
 */
async function getOrCreateUser(
  profile: YaliesProfile,
  netid: string,
  /** Someone else making the account (logged in this season); null: their own login. */
  createdFor: { by: Actor; seasonId: string } | null
): Promise<void> {
  const ref = userRef(profile.email);
  const signingIn = createdFor === null;
  await runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const user = readUser(snap.data()!);
      // Their own login claims an account made for them; someone else's add only fills in a missing NetID.
      const claim = signingIn && !user.claimedAt;
      if (claim || user.netid !== netid) {
        tx.update(ref, { netid, ...(claim ? { claimedAt: FieldValue.serverTimestamp() } : {}) });
      }
      return;
    }
    const n = ((await tx.get(usernameCounterRef())).data()?.count || 0) + 1;
    let username = generateUsername(n);
    const taken = (await tx.get(usernameRef(username))).exists;
    if (taken) username = "Anonymous";

    tx.set(usernameCounterRef(), { count: n }, { merge: true });
    if (!taken) tx.set(usernameRef(username), { userId: profile.email });
    tx.create(ref, {
      email: profile.email,
      firstname: profile.first_name,
      lastname: profile.last_name,
      netid,
      username,
      roles: [],
      claimedAt: signingIn ? FieldValue.serverTimestamp() : null,
      createdBy: createdFor?.by.userId ?? null,
    });
    if (createdFor) {
      logAction(tx, createdFor.seasonId, {
        actor: createdFor.by,
        action: "createAccountFor",
        params: { email: profile.email, netid },
        changed: [],
        created: [ref],
      });
    }
  });
}

/** Records the NetID of a user who has none yet (signed in before NetIDs were kept). */
export async function recordNetid(email: string, netid: string): Promise<void> {
  await userRef(email).update({ netid });
}

/**
 * The person's membership of the season, created on their first visit of it
 * (D30) with the college named `collegeName` (from Yalies; null if it names
 * none of the season's colleges).
 */
export async function joinSeason(
  seasonId: string,
  email: string,
  name: string,
  collegeName: unknown,
  joinedVia: JoinedVia = "login"
): Promise<Pick<PlayerDoc, "collegeId" | "roles">> {
  const colleges = await listColleges(seasonId);
  const ref = playerRef(seasonId, email);
  return runTransaction(async (tx) => {
    const existing = (await tx.get(ref)).data();
    if (existing) return existing;
    const collegeId = collegeIdOfName(colleges, collegeName);
    tx.create(ref, {
      seasonId,
      collegeId,
      name,
      // A placeholder (an unverified NetID) has no account yet.
      userId: placeholderNetid(email) ? null : email,
      roles: [],
      joinedAt: FieldValue.serverTimestamp(),
      joinedVia,
    });
    return { collegeId, roles: [] };
  });
}

/**
 * Moves the placeholder players of `netid` (one per season at most, made when
 * the NetID was added without a directory match) onto the account `email`:
 * their roster entries become that person's (merged with an entry they
 * already have on the same game: present if either was), the season's player
 * doc is created from the placeholder when they have none, and the
 * placeholder goes. Audit-logged. Returns how many entries moved.
 */
export async function claimPlaceholders(netid: string, email: string, name: string): Promise<number> {
  const placeholder = placeholderId(netid);
  let moved = 0;
  for (const { id: seasonId } of await listSeasons()) {
    const placeholderRef = playerRef(seasonId, placeholder);
    if (!(await placeholderRef.get()).exists) continue;
    const entries = await listPlayerEntries(seasonId, placeholder);
    moved += await runTransaction(async (tx) => {
      const sources = entries.map((e) => rosterEntryRef(seasonId, e.matchId, placeholder));
      const targets = entries.map((e) => rosterEntryRef(seasonId, e.matchId, email));
      const [placeholderSnap, playerSnap] = await tx.getAll(placeholderRef, playerRef(seasonId, email));
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
          playerId: email,
          name,
          present: !!(existing?.present || entry.present),
          captainStatus: existing?.captainStatus ?? entry.captainStatus,
        });
        tx.delete(sources[i]);
      });
      if (!playerSnap.exists) {
        tx.create(playerRef(seasonId, email), { ...(placeholderSnap.data() as PlayerDoc), name, userId: email });
      }
      tx.delete(placeholderRef);
      const actor: Actor = { userId: email, roles: ["user"] };
      logAction(tx, seasonId, {
        actor,
        action: "claimPlaceholder",
        params: { netid, email },
        changed: [placeholderSnap, ...sourceSnaps, ...targetSnaps.filter((s) => s.exists)],
        created: [...targets.filter((_, i) => !targetSnaps[i].exists), ...(playerSnap.exists ? [] : [playerRef(seasonId, email)])],
      });
      return sourceSnaps.filter((s) => s.exists).length;
    });
  }
  return moved;
}
