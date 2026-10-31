// Today's API response shapes (types/api.ts, from the pre-v3 schema in
// types/legacy.ts), built from v3 docs, so the pages keep working unchanged
// (D35). Only the conversions several routes share live here; a route with
// its own shape builds it inline. Goes away when the pages read v3 shapes.
import "server-only";
import type { PlayerDoc, UserDoc } from "@/types/firestore";
import type { UserDoc as LegacyUserDoc } from "@/types/legacy";
import { mergedRoles } from "./services/roles";

/**
 * A person as the pre-v3 user doc the rep and dev pages read: names, the
 * college's name, the merged roles and the sports they captain.
 */
export function legacyUser(
  email: string,
  user: UserDoc | undefined,
  player: PlayerDoc | undefined,
  collegeName: string | null,
  captainOf: string[]
): LegacyUserDoc {
  const [first = "", ...rest] = (player?.name ?? "").split(" ");
  return {
    email,
    firstname: user?.firstname ?? first,
    lastname: user?.lastname ?? rest.join(" "),
    college: collegeName,
    username: user?.username,
    mRoles: mergedRoles(user ?? null, player ?? null, captainOf.length > 0),
    sportsCaptainOf: captainOf,
  };
}
