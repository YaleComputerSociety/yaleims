// Accounts: the user behind a Yale login and their season membership. The
// first login creates users/{email} with a generated username and the NetID
// (recorded for users from before, at their next login or visit); the first
// visit of a season creates the season's player doc (D30) with the college
// Yalies gave.
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { collegeIdOfName } from "@/lib/colleges";
import type { PlayerDoc } from "@/types/firestore";
import { listColleges } from "../data/colleges";
import { playerRef } from "../data/players";
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

/** The profile fields a login gets from Yalies. */
export interface YaliesProfile {
  email: string;
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
  await getOrCreateUser(profile, netid);
  const name = `${profile.first_name} ${profile.last_name}`.trim();
  await joinSeason(seasonId, profile.email, name, profile.college);
}

/**
 * The user, created when missing: a generated username from the next value
 * of the username counter ("Anonymous" if that one is taken). Counter,
 * username and user change in one transaction.
 */
async function getOrCreateUser(profile: YaliesProfile, netid: string): Promise<void> {
  const ref = userRef(profile.email);
  await runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const user = readUser(snap.data()!);
      if (!user.claimedAt || user.netid !== netid) {
        tx.update(ref, { netid, ...(user.claimedAt ? {} : { claimedAt: FieldValue.serverTimestamp() }) });
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
      claimedAt: FieldValue.serverTimestamp(),
      createdBy: null,
    });
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
  collegeName: unknown
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
      userId: email,
      roles: [],
      joinedAt: FieldValue.serverTimestamp(),
      joinedVia: "login",
    });
    return { collegeId, roles: [] };
  });
}
