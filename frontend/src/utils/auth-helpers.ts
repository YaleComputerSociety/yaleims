import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

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
  const decoded = jwt.verify(token.value, secret) as { [key: string]: any };

  return requiredRoles.some((role) => decoded.mRoles.includes(role));
};
