// Accounts: the user behind a Yale login, their season membership and the
// session fields built from both. The first login creates users/{email} with
// a generated username; the first visit of a season creates the season's
// player doc (D30) with the college Yalies gave.
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { collegeIdOfName } from "@/lib/colleges";
import type { SessionUser } from "@/types/api";
import type { PlayerDoc, UserDoc } from "@/types/firestore";
import { listColleges } from "../data/colleges";
import { playerRef } from "../data/players";
import { listCaptainTeams } from "../data/teams";
import { readUser, userRef, usernameCounterRef, usernameRef } from "../data/users";
import { runTransaction } from "../data/util";
import { mergedRoles } from "./roles";

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

/** The session fields that come from Firestore (the login adds name and netid). */
export type AccountFields = Pick<
  SessionUser,
  "role" | "mRoles" | "username" | "college" | "matches_played"
>;

/**
 * Signs a Yale user in: creates their account on the first login (or claims
 * one a captain made for them, U10) and their membership of the season.
 * Throws for a non-Yale email.
 */
export async function signIn(profile: YaliesProfile, seasonId: string): Promise<AccountFields> {
  if (!profile.email || !profile.email.endsWith("@yale.edu")) {
    throw new Error("You must use a Yale email to sign in.");
  }
  const user = await getOrCreateUser(profile);
  const name = `${profile.first_name} ${profile.last_name}`.trim();
  const player = await joinSeason(seasonId, profile.email, name, profile.college);
  return accountFields(seasonId, profile.email, user, player);
}

/**
 * The user, created when missing: a generated username from the next value
 * of the username counter ("Anonymous" if that one is taken). Counter,
 * username and user change in one transaction.
 */
async function getOrCreateUser(profile: YaliesProfile): Promise<Pick<UserDoc, "roles" | "username">> {
  const ref = userRef(profile.email);
  return runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const user = readUser(snap.data()!);
      if (!user.claimedAt) tx.update(ref, { claimedAt: FieldValue.serverTimestamp() });
      return user;
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
      username,
      roles: [],
      claimedAt: FieldValue.serverTimestamp(),
      createdBy: null,
    });
    return { roles: [], username };
  });
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

/** The session's Firestore fields: roles from all three places, the college's name. */
export async function accountFields(
  seasonId: string,
  email: string,
  user: Pick<UserDoc, "roles" | "username"> | null,
  player: Pick<PlayerDoc, "roles" | "collegeId"> | null
): Promise<AccountFields> {
  const [captainTeams, colleges] = await Promise.all([
    listCaptainTeams(seasonId, email),
    listColleges(seasonId),
  ]);
  return {
    role: "user", // the pre-v3 single role; roles live in mRoles
    mRoles: mergedRoles(user, player, captainTeams.length > 0),
    username: user?.username ?? "Anonymous",
    college: colleges.find((c) => c.id === player?.collegeId)?.name ?? "",
    matches_played: 0,
  };
}
