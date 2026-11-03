// Who is calling and what they may do (server/session.ts' identity,
// server/auth.ts): the session cookie and Firestore are stubbed, so these run
// without the emulator. The integration tests check the same rules per route.
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayerDoc, UserDoc } from "@/types/firestore";

vi.mock("server-only", () => ({}));

// The session cookie, and the docs Firestore holds (by email).
const SECRET = "test-secret";
let cookie: string | undefined;
let users: Record<string, Partial<UserDoc>> = {};
let players: Record<string, Partial<PlayerDoc>> = {};
let captains: Record<string, string[]> = {};
const reads = { user: 0, player: 0, teams: 0 };

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (cookie ? { value: cookie } : undefined) }),
}));
vi.mock("@/server/data/seasons", () => ({ getCurrentSeasonId: async () => "2026-2027" }));
vi.mock("@/server/data/users", () => ({
  getUser: async (email: string) => (reads.user++, users[email] ?? null),
}));
vi.mock("@/server/data/players", () => ({
  getPlayer: async (_season: string, email: string) => (reads.player++, players[email] ?? null),
}));
vi.mock("@/server/data/teams", () => ({
  listCaptainTeams: async (_season: string, email: string) => (reads.teams++, (captains[email] ?? []).map((sportId) => ({ sportId }))),
}));

const { getIdentity, setSessionCookie } = await import("@/server/session");
const { authorize, can, getViewer, requireViewer } = await import("@/server/auth");

const signIn = (payload: object, secret = SECRET) => {
  cookie = jwt.sign(payload, secret, { expiresIn: "1h" });
};

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
  cookie = undefined;
  users = {};
  players = {};
  captains = {};
  Object.assign(reads, { user: 0, player: 0, teams: 0 });
});

describe("the identity", () => {
  it("is null without a valid cookie", async () => {
    expect(await getIdentity()).toBeNull();
    signIn({ netid: "abc1", email: "a@yale.edu" }, "another-secret");
    expect(await getIdentity()).toBeNull();
    signIn({ name: "No Email" });
    expect(await getIdentity()).toBeNull();
  });
  it("takes only who they are from an old cookie, never its roles", async () => {
    signIn({ name: "Ada L", netid: "al1", email: "al1@yale.edu", college: "Morse", mRoles: ["user", "admin"], role: "admin" });
    expect(await getIdentity()).toEqual({ email: "al1@yale.edu", netid: "al1", name: "Ada L", college: "Morse" });
  });
  it("is all a login's cookie carries", () => {
    const res = new NextResponse(null);
    const identity = { email: "al1@yale.edu", netid: "al1", name: "Ada L", college: "Morse" };
    setSessionCookie(res, identity);
    const { iat, exp, ...payload } = jwt.verify(res.cookies.get("token")!.value, SECRET) as Record<string, unknown>;
    expect(payload).toEqual(identity);
    expect(Number(exp) - Number(iat)).toBe(7 * 24 * 60 * 60);
  });
  it("has no college when the cookie names none", async () => {
    signIn({ netid: "al1", email: "al1@yale.edu", college: "" });
    expect(await getIdentity()).toEqual({ email: "al1@yale.edu", netid: "al1", name: "", college: null });
  });
});

describe("the viewer", () => {
  it("reads each of their docs once, however often a route asks", async () => {
    signIn({ netid: "al1", email: "al1@yale.edu" });
    users["al1@yale.edu"] = { roles: ["dev"] };
    players["al1@yale.edu"] = { collegeId: "MC", roles: ["college_rep"] };
    captains["al1@yale.edu"] = ["1"];
    const viewer = (await getViewer())!;
    await Promise.all([viewer.globalRoles(), viewer.player(), viewer.captainOf(), viewer.actor(), viewer.globalRoles()]);
    expect(await viewer.actor()).toEqual({ userId: "al1@yale.edu", roles: ["user", "dev", "college_rep", "captain"] });
    expect(await viewer.captainOf()).toEqual(["1"]);
    expect(reads).toEqual({ user: 1, player: 1, teams: 1 });
  });
  it("is 401 when signed out, 403 when the rule says no", async () => {
    await expect(requireViewer()).rejects.toMatchObject({ code: "unauthenticated", status: 401 });
    await expect(authorize(can.score)).rejects.toMatchObject({ status: 401 });
    signIn({ netid: "p1", email: "p1@yale.edu" });
    await expect(authorize(can.score)).rejects.toMatchObject({ code: "forbidden", status: 403 });
    users["p1@yale.edu"] = { roles: ["admin"] };
    expect((await authorize(can.score)).email).toBe("p1@yale.edu");
  });
});

describe("the permissions (today's matrix, PHASE-2D-PLAN §3.4)", () => {
  // Someone signed in with these roles; a rep or player of Morse (MC).
  const who = async (globalRoles: UserDoc["roles"], seasonRoles: PlayerDoc["roles"] = [], collegeId: string | null = "MC") => {
    const email = `${globalRoles.join("-")}-${seasonRoles.join("-")}-${collegeId}@yale.edu`;
    signIn({ netid: "x", email });
    users[email] = { roles: globalRoles };
    players[email] = { collegeId, roles: seasonRoles };
    return (await getViewer())!;
  };
  it("gives the schedule and scoring to admins and devs", async () => {
    for (const rule of [can.editSchedule, can.score]) {
      expect(await rule(await who(["admin"]))).toBe(true);
      expect(await rule(await who(["dev"]))).toBe(true);
      expect(await rule(await who([], ["college_rep", "supervisor"]))).toBe(false);
    }
  });
  it("gives the champion to admins only, and roles to devs only", async () => {
    expect(await can.setChampion(await who(["admin"]))).toBe(true);
    expect(await can.setChampion(await who(["dev"]))).toBe(false);
    expect(await can.manageRoles(await who(["dev"]))).toBe(true);
    expect(await can.manageRoles(await who(["admin"]))).toBe(false);
  });
  it("lets a rep act for their own college only", async () => {
    const rep = await who([], ["college_rep"]);
    for (const rule of [can.listPlayers, can.manageCaptains, can.nameMvps]) {
      expect(await rule(rep, "MC")).toBe(true);
      expect(await rule(rep, "BK")).toBe(false);
      expect(await rule(await who([]), "MC")).toBe(false);
    }
  });
  it("lets admins and devs manage any college's captains and MVPs, and devs list its players", async () => {
    expect(await can.manageCaptains(await who(["admin"]), "BK")).toBe(true);
    expect(await can.nameMvps(await who(["dev"]), "BK")).toBe(true);
    expect(await can.listPlayers(await who(["dev"]), "BK")).toBe(true);
    expect(await can.listPlayers(await who(["admin"]), "BK")).toBe(false);
  });
  it("shows a college's leaders to its own players", async () => {
    expect(await can.seeLeaders(await who([]), "MC")).toBe(true);
    expect(await can.seeLeaders(await who([]), "BK")).toBe(false);
    expect(await can.seeLeaders(await who([], [], null), "MC")).toBe(false);
  });
});
