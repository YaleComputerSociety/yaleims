// NetIDs and the players they stand for before Yalies has confirmed them: a
// NetID added without a directory match is a placeholder player
// "netid-<netid>", matched to the real account later (services/accounts.ts
// claimPlaceholders). Shared by the server and the pages.

/** A Yale NetID as typed: letters and digits, starting with a letter (lowercase it first). */
export const NETID_PATTERN = /^[a-z][a-z0-9]{1,15}$/;

/** The player id of the placeholder for `netid`. */
export const placeholderId = (netid: string) => `netid-${netid}`;

/** The NetID a placeholder player stands for; null for anyone else. */
export const placeholderNetid = (playerId: string) => (playerId.startsWith("netid-") ? playerId.slice(6) : null);
