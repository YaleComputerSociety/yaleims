import admin from "./firebaseAdmin.js";

export interface DecodedToken {
  name: string;
  netid: string;
  email: string;
  role: string;
  mRoles: string[];
  username: string;
  college: string;
  matches_played: number;
}

export function isValidDecodedToken(decoded: any): decoded is DecodedToken {
  return (
    typeof decoded === "object" &&
    typeof decoded.netid === "string" &&
    typeof decoded.email === "string"
  );
}

/**
 * Roles live in the mRoles array; the singular `role` field no longer exists on
 * user docs, so tokens ship without it and checks against it always failed.
 * The legacy field is still honoured for any token that happens to carry one.
 */
export function tokenHasRole(decoded: any, allowed: string[]): boolean {
  const roles: string[] = Array.isArray(decoded?.mRoles) ? decoded.mRoles : [];
  if (typeof decoded?.role === "string") {
    roles.push(decoded.role);
  }
  return allowed.some((role) => roles.includes(role));
}

/** points_for_win of the sport named `sportName` (0 if unset); throws if none. */
export const getPointsForWinBySportName = async (sportName: string) => {
  const querySnapshot = await admin
    .firestore()
    .collection("sports")
    .where("name", "==", sportName)
    .get();
  if (querySnapshot.empty) {
    throw new Error(`No sport found with the name: ${sportName}`);
  }
  return querySnapshot.docs[0].data().points_for_win || 0;
};
