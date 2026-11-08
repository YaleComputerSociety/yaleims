// NetIDs and the "netid-<netid>" id: the account a NetID gets when no older
// (email-keyed) account has it, made at its first sign-in or, unclaimed,
// when a captain or supervisor adds the person; before November 2026 also a
// placeholder player with no account. Either moves onto an older account the
// directory later links to the NetID (services/accounts.ts
// claimPlaceholders). Shared by the server and the pages.

/** A Yale NetID as typed: letters and digits, starting with a letter (lowercase it first). */
export const NETID_PATTERN = /^[a-z][a-z0-9]{1,15}$/;

/** The id ("netid-<netid>") of the account, or placeholder player, for `netid`. */
export const placeholderId = (netid: string) => `netid-${netid}`;

/** The NetID in a "netid-<netid>" id; null for any other id. */
export const placeholderNetid = (playerId: string) => (playerId.startsWith("netid-") ? playerId.slice(6) : null);
