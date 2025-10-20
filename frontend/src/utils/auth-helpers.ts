import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

interface DecodedToken {
  name: string;
  netid: string;
  email: string;
  role: string;
  mRoles: string[];
  username: string;
  college: string;
  points: number;
  matches_played: number;
}

const decodedTokenShape: DecodedToken = {
  name: "",
  netid: "",
  email: "",
  role: "",
  mRoles: [],
  username: "",
  college: "",
  points: 0,
  matches_played: 0,
};

/**
 * Helper function to check if the current user has one of the required roles.
 * @param requiredRoles
 * @returns boolean true if current user is authenticated and has one of the requiredRoles, false otherwise
 */
export const userTokenHasRoles = async (
  requiredRoles: string[]
): Promise<boolean> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("token");
  if (!token) {
    return false;
  }

  const secret = process.env.JWT_SECRET as string;
  const decoded = jwt.verify(token.value, secret) as DecodedToken;

  if (!isValidDecodedToken(decoded)) {
    return false;
  }

  return requiredRoles.some((role) => decoded.mRoles.includes(role));
};

const isValidDecodedToken = (decoded: any): boolean => {
  if (typeof decoded !== "object" || decoded === null) {
    return false;
  }

  const requiredFields = Object.keys(decodedTokenShape);

  return requiredFields.every((field) => field in decoded);
};
