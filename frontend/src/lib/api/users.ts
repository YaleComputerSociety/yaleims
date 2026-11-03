// The users API (admins): who holds a role (/api/users?role: admin and dev
// are global, supervisor is this season's) and setting a user's roles
// (/api/users/{email}/roles, current season).
import { z } from "zod";
import type { PlayerDoc, UserDoc, WithId } from "@/types/firestore";
import { request, url, type Json } from "./core";

/** A user with their player doc this season (null: not a player) and the sports (ids) they captain. */
export type RoleHolder = Json<WithId<UserDoc>> & { player: Json<PlayerDoc> | null; captainOf: string[] };

export interface RoleHolderList {
  items: RoleHolder[];
  total: number;
}

export const roleHoldersQuerySchema = z.strictObject({ role: z.enum(["admin", "dev", "supervisor"]) });
export type RoleHoldersQuery = z.infer<typeof roleHoldersQuerySchema>;

/**
 * PUT /api/users/{email}/roles: every role they should hold. Season roles
 * and captaincies need them to be a player this season, in a college.
 */
export const userRolesSchema = z.strictObject({
  roles: z.array(z.enum(["admin", "dev", "college_rep", "supervisor"])).max(4),
  /** Sport ids; [] = no captaincies. */
  captainOf: z.array(z.string().min(1)).max(15),
});
export type UserRoles = z.infer<typeof userRolesSchema>;

export const fetchRoleHolders = (query: RoleHoldersQuery) => request<RoleHolderList>("GET", "/api/users", { query });

export const setUserRoles = (email: string, roles: UserRoles) =>
  request<void>("PUT", url`/api/users/${email}/roles`, { body: roles });
