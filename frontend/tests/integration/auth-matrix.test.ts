// Who may call each route of the new API (PHASE-2D-PLAN §3.4), for seven
// kinds of caller. An allowed caller sends a request that fails after the
// permission check (an unknown id or a bad field: 400/404), so nothing is
// written; a refused one gets 401 (signed out) or 403. The current-season-only
// routes answer 409 for last season.
import { beforeAll, describe, expect, it } from "vitest";
import { api, people, seasons, sessionFor, setGlobalRoles } from "./helpers";

const BF = 0, BK = 1;
const callers = {
  anonymous: null,
  player: people.student(BF, 6),
  rep: people.student(BF, 0), // Benjamin Franklin's rep: the routes below act on BF
  otherRep: people.student(BK, 0),
  supervisor: people.supervisor,
  adminOnly: people.student(10, 7),
  devOnly: people.student(11, 7),
};
type Caller = keyof typeof callers;
const signedIn: Caller[] = ["player", "rep", "otherRep", "supervisor", "adminOnly", "devOnly"];
const adminOrDev: Caller[] = ["adminOnly", "devOnly"];

let current: string, previous: string;
beforeAll(async () => {
  ({ current, previous } = await seasons());
  await setGlobalRoles(callers.adminOnly, ["admin"]);
  await setGlobalRoles(callers.devOnly, ["dev"]);
});

interface Case {
  method: string;
  /** The path for a season. */
  path: (season: string) => string;
  body?: unknown;
  allowed: Caller[];
  /** Current season only: 409 for last season. */
  currentOnly?: boolean;
}
const nobody = encodeURIComponent("nobody@example.edu");
const game = { startsAt: new Date().toISOString(), homeCollegeId: "BF", awayCollegeId: "BK", venue: null, venueDetail: null };
const cases: Record<string, Case> = {
  "set the champion": { method: "PATCH", path: (s) => `/api/seasons/${s}`, body: { championCollegeId: "XX", celebrationActive: false }, allowed: ["adminOnly"], currentOnly: true },
  "upload a schedule": { method: "POST", path: (s) => `/api/seasons/${s}/matches`, body: { sportId: "99", matches: [game] }, allowed: adminOrDev },
  "edit a game": { method: "PATCH", path: (s) => `/api/seasons/${s}/matches/nope`, body: { venue: "X" }, allowed: adminOrDev },
  "score a game": { method: "PUT", path: (s) => `/api/seasons/${s}/matches/nope/result`, body: { homeScore: 1, awayScore: 0, homeForfeit: false, awayForfeit: false }, allowed: adminOrDev },
  "undo a score": { method: "DELETE", path: (s) => `/api/seasons/${s}/matches/nope/result`, allowed: adminOrDev },
  "read a roster": { method: "GET", path: (s) => `/api/seasons/${s}/matches/nope/roster`, allowed: signedIn },
  "sign up": { method: "PUT", path: (s) => `/api/seasons/${s}/matches/nope/roster/me`, allowed: signedIn },
  withdraw: { method: "DELETE", path: (s) => `/api/seasons/${s}/matches/nope/roster/me`, allowed: signedIn },
  "read a game's reports": { method: "GET", path: (s) => `/api/seasons/${s}/matches/nope/reports`, allowed: signedIn },
  "report a score": { method: "POST", path: (s) => `/api/seasons/${s}/matches/nope/reports`, body: { reason: "x" }, allowed: signedIn },
  "resolve a report": { method: "PATCH", path: (s) => `/api/seasons/${s}/matches/nope/reports/nope`, body: { status: "resolved" }, allowed: adminOrDev },
  "read the season's reports": { method: "GET", path: (s) => `/api/seasons/${s}/reports?status=nope`, allowed: adminOrDev },
  "create a bracket": { method: "POST", path: (s) => `/api/seasons/${s}/brackets`, body: { kind: "playoffs", sportId: "99", slots: [] }, allowed: adminOrDev, currentOnly: true },
  "delete a bracket": { method: "DELETE", path: (s) => `/api/seasons/${s}/brackets/nope`, allowed: adminOrDev, currentOnly: true },
  "list a college's players": { method: "GET", path: (s) => `/api/seasons/${s}/colleges/BF/players`, allowed: ["rep", "devOnly"], currentOnly: true },
  "see a college's leaders": { method: "GET", path: (s) => `/api/seasons/${s}/colleges/BF/leaders`, allowed: ["player", "rep"] },
  "assign a captain": { method: "PUT", path: (s) => `/api/seasons/${s}/colleges/BF/teams/1/captains/${nobody}`, allowed: ["rep", ...adminOrDev], currentOnly: true },
  "remove a captain": { method: "DELETE", path: (s) => `/api/seasons/${s}/colleges/BF/teams/1/captains/${nobody}`, allowed: ["rep", ...adminOrDev], currentOnly: true },
  "read a college's MVPs": { method: "GET", path: (s) => `/api/seasons/${s}/colleges/BF/mvps`, allowed: ["rep", ...adminOrDev] },
  "name an MVP": { method: "PUT", path: (s) => `/api/seasons/${s}/colleges/BF/mvps/40`, body: { playerId: "nobody@example.edu" }, allowed: ["rep", ...adminOrDev] },
  "list role holders": { method: "GET", path: () => "/api/users?role=nope", allowed: ["devOnly"] },
  "set someone's roles": { method: "PUT", path: () => `/api/users/${nobody}/roles`, body: { roles: [], captainOf: [] }, allowed: ["devOnly"] },
  "read past results": { method: "GET", path: () => "/api/matches?page=0", allowed: signedIn },
  "change one's username": { method: "PATCH", path: () => "/api/me", body: { username: "x" }, allowed: signedIn },
  "list one's games": { method: "GET", path: () => "/api/me/matches", allowed: signedIn },
};

describe.each(Object.entries(cases))("%s", (_, c) => {
  it.each(Object.keys(callers) as Caller[])("as %s", async (caller) => {
    const email = callers[caller];
    // The cookie claims every role: only Firestore counts.
    const session = email ? sessionFor(email, ["user", "admin", "dev", "college_rep", "captain", "supervisor"]) : undefined;
    const { status } = await api(c.method, c.path(current), c.body, { session });
    if (!email) expect(status).toBe(401);
    else if (c.allowed.includes(caller)) expect([200, 204, 400, 404]).toContain(status);
    else expect(status).toBe(403);
  });
  if (c.currentOnly) {
    it("answers 409 for last season", async () => {
      const allowed = callers[c.allowed[0]]!;
      expect((await api(c.method, c.path(previous), c.body, { session: sessionFor(allowed) })).status).toBe(409);
    });
  }
});
