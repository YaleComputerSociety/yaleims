// Accounts: the user record behind a Yale login. The first login creates it,
// with a generated username, from the Yalies profile found by the login.
import "server-only";
import { getOrCreateUser, type UserDoc } from "../data/users";

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

/** The user fields the session token is built from. */
export type AccountUser = Pick<
  UserDoc,
  "firstname" | "lastname" | "email" | "college" | "role" | "mRoles" | "matches_played" | "username"
>;

/**
 * The account for a Yale login, created on the first login. Throws for a
 * non-Yale email.
 */
export async function getOrCreateAccount(
  profile: YaliesProfile,
  seasonId: string
): Promise<AccountUser> {
  if (!profile.email || !profile.email.endsWith("@yale.edu")) {
    throw new Error("You must use a Yale email to sign in.");
  }
  const { user } = await getOrCreateUser(
    {
      email: profile.email,
      firstname: profile.first_name,
      lastname: profile.last_name,
      college: profile.college || null,
    },
    seasonId,
    generateUsername
  );
  return {
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    college: user.college,
    role: user.role,
    mRoles: user.mRoles,
    matches_played: user.matches_played,
    username: user.username,
  };
}
