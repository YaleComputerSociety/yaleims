// Full login round trips against local CAS/Yalies fixtures and Firestore.
// The harness preloads the CAS fetch transport; no request reaches real Yale.
import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { paths } from "@/lib/paths";
import { api, BASE, db, people, seasons, sessionFor } from "./helpers";

const CAS = process.env.TEST_CAS_URL!;
const SECRET = process.env.TEST_JWT_SECRET!;
const proofName = "yims_login"; // The integration app runs in development mode.
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const attempts: string[] = [];
const saved = new Map<string, DocumentData | undefined>();
// The fake directory's people have no account yet: a first login makes users/netid-<netid>.
const accounts = ["netid-zz901", "netid-zz903", "netid-zz909"];
let current: string;
beforeAll(async () => { ({ current } = await seasons()); });
afterEach(async () => {
  for (const state of attempts.splice(0)) await db.doc(paths.loginAttempt(hash(state))).delete();
  for (const userId of accounts) {
    const before = saved.get(paths.user(userId));
    const after = (await db.doc(paths.user(userId)).get()).data();
    if (saved.has(paths.user(userId)) && !before && after?.username) await db.doc(paths.username(after.username)).delete();
  }
  for (const [path, data] of saved) {
    if (data) await db.doc(path).set(data);
    else await db.doc(path).delete();
  }
  saved.clear();
});

async function accountState() {
  const refs = accounts.flatMap((userId) => [db.doc(paths.user(userId)), db.doc(paths.player(current, userId))]);
  const docs = await db.getAll(...refs, db.doc(paths.usernameCounter));
  for (const doc of docs.slice(0, -1)) if (!saved.has(doc.ref.path)) saved.set(doc.ref.path, doc.data());
  return {
    docs: docs.map((doc) => ({ path: doc.ref.path, data: doc.data() })),
    auditCount: (await db.collection(paths.auditLog(current)).count().get()).data().count,
  };
}

async function raw(url: string, cookie?: string) {
  const response = await fetch(new URL(url, BASE), { redirect: "manual", headers: cookie ? { cookie } : {} });
  return { status: response.status, location: response.headers.get("location"), cookies: response.headers.getSetCookie(),
    cache: response.headers.get("cache-control"), referrer: response.headers.get("referrer-policy"), body: await response.text() };
}

async function start(from = "/hub") {
  const response = await raw(`/api/auth/login?from=${encodeURIComponent(from)}`);
  expect(response.status).toBe(307);
  const cas = new URL(response.location!);
  expect(cas.origin + cas.pathname).toBe("https://secure.its.yale.edu/cas/login");
  const service = cas.searchParams.get("service")!;
  const state = new URL(service).searchParams.get("state")!;
  expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
  const cookie = response.cookies.find((value) => value.startsWith(`${proofName}=`))!.split(";")[0];
  attempts.push(state);
  return { response, service, state, cookie, ref: db.doc(paths.loginAttempt(hash(state))) };
}

async function ticket(service: string, netid = "zz901", mode?: "unavailable" | "malformed") {
  const response = await fetch(`${CAS}/tickets`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ service, netid, mode }) });
  expect(response.status).toBe(201);
  return (await response.json()).ticket as string;
}

async function calls(id: string): Promise<{ ticket: string; service: string }[]> {
  return (await (await fetch(`${CAS}/calls`)).json()).filter((call: { ticket: string }) => call.ticket === id);
}
const callback = (service: string, id: string) => `${service}&ticket=${encodeURIComponent(id)}`;
const withVictim = (proof: string) => `${proof}; token=${sessionFor(people.student(4, 6))}`;
function privateResponse(response: Awaited<ReturnType<typeof raw>>) {
  expect(response.cache?.split(/,\s*/)).toContain("no-store");
  expect(response.referrer).toBe("no-referrer");
}
/** No session was issued; the browser went home (it had one) or to the explanation page. */
function refused(response: Awaited<ReturnType<typeof raw>>, location = "/") {
  expect(response.status).toBe(307);
  expect(response.location).toBe(`${BASE}${location}`);
  expect(response.cookies.some((cookie) => cookie.startsWith("token="))).toBe(false);
  privateResponse(response);
}
const failedPage = (problem: string) => `/sign-in-failed?problem=${problem}`;
function cleared(response: Awaited<ReturnType<typeof raw>>) {
  expect(response.cookies).toContainEqual(expect.stringMatching(/^yims_login=;.*Max-Age=0/i));
}

describe("CAS browser binding", () => {
  it("stores only hashes and a short-lived sanitized return path; the proof stays out of URLs", async () => {
    for (const from of ["/games?college=MC#today", "https://evil.example/path"]) {
      const attempt = await start(from);
      const proof = attempt.cookie.slice(proofName.length + 1);
      const record = (await attempt.ref.get()).data()!;
      expect(record).toEqual({ browserHash: hash(proof), from: from.startsWith("https:") ? "/" : from, expiresAt: expect.any(Timestamp) });
      expect(record.expiresAt.toMillis() - Date.now()).toBeGreaterThan(590_000);
      expect(record.expiresAt.toMillis() - Date.now()).toBeLessThanOrEqual(600_000);
      expect(attempt.state).not.toBe(proof);
      expect(attempt.service).not.toContain(proof);
      expect(new URL(attempt.service).searchParams.has("from")).toBe(false);
      expect(attempt.response.cookies[0]).toMatch(/HttpOnly/i);
      expect(attempt.response.cookies[0]).toMatch(/SameSite=Lax/i);
      expect(attempt.response.cookies[0]).toMatch(/Max-Age=600/i);
      expect(attempt.response.cookies[0]).not.toMatch(/Domain=/i);
      privateResponse(attempt.response);
    }
  });

  it("completes a bound login, validates the exact service, and ignores a substituted return path", async () => {
    await accountState();
    const attempt = await start("/games?sport=Flag Football&college=MC#today");
    const id = await ticket(attempt.service);
    const response = await raw(`${callback(attempt.service, id)}&from=https://evil.example`, withVictim(attempt.cookie));
    expect(response.status).toBe(307);
    expect(response.location).toBe(`${BASE}/games?sport=Flag%20Football&college=MC#today`);
    expect(await calls(id)).toEqual([{ ticket: id, service: attempt.service }]);
    expect((await attempt.ref.get()).exists).toBe(false);
    cleared(response);
    privateResponse(response);
    const token = response.cookies.find((cookie) => cookie.startsWith("token="))!.split(";")[0].slice(6);
    expect(token).not.toBe(attempt.cookie.slice(proofName.length + 1));
    const { iat, exp, ...payload } = jwt.verify(token, SECRET) as Record<string, unknown>;
    expect(payload).toEqual({ v: 2, userId: "netid-zz901", netid: "zz901" });
    expect(Number(exp) - Number(iat)).toBe(7 * 24 * 60 * 60);
    const session = await api("GET", "/api/auth/session", undefined, { session: token });
    expect(session.body.viewer).toMatchObject({ userId: "netid-zz901", email: "zoe.zane@yale.edu", name: "Zoe Zane", collegeId: "BF" });
  });

  it.each(["missing-cookie", "another-browser", "state-as-cookie"])("refuses %s without consuming either browser's attempt or changing the current session", async (mode) => {
    const before = await accountState();
    const attempt = await start();
    const other = await start();
    const id = await ticket(attempt.service);
    const cookie = mode === "missing-cookie" ? "" : mode === "another-browser" ? other.cookie : `${proofName}=${attempt.state}`;
    const response = await raw(callback(attempt.service, id), withVictim(cookie));
    refused(response);
    expect(response.cookies).toHaveLength(0);
    expect(await calls(id)).toHaveLength(0);
    expect((await attempt.ref.get()).exists).toBe(true);
    expect((await other.ref.get()).exists).toBe(true);
    expect(await accountState()).toEqual(before);
  });

  it("checks expiry even while the expired record still exists", async () => {
    const before = await accountState();
    const attempt = await start();
    await attempt.ref.update({ expiresAt: Timestamp.fromMillis(Date.now() - 1) });
    expect((await attempt.ref.get()).exists).toBe(true);
    const id = await ticket(attempt.service);
    const response = await raw(callback(attempt.service, id), withVictim(attempt.cookie));
    refused(response);
    cleared(response);
    expect((await attempt.ref.get()).exists).toBe(false);
    expect(await calls(id)).toHaveLength(0);
    expect(await accountState()).toEqual(before);
  });

  it.each(["state", "ticket", "missing-ticket", "malformed-state"])("refuses ambiguous or incomplete callback fields (%s) without consuming the attempt", async (mode) => {
    const before = await accountState();
    const attempt = await start();
    const id = await ticket(attempt.service);
    let url = callback(attempt.service, id);
    if (mode === "state") url += `&state=${attempt.state}`;
    if (mode === "ticket") url += `&ticket=${id}`;
    if (mode === "missing-ticket") url = attempt.service;
    if (mode === "malformed-state") url = url.replace(attempt.state, "invalid");
    const response = await raw(url, withVictim(attempt.cookie));
    refused(response);
    expect((await attempt.ref.get()).exists).toBe(true);
    expect(await calls(id)).toHaveLength(0);
    expect(await accountState()).toEqual(before);
  });

  it("does not replay a consumed attempt even with a fresh valid CAS ticket and the old cookie", async () => {
    await accountState();
    const attempt = await start();
    const first = await ticket(attempt.service);
    expect((await raw(callback(attempt.service, first), attempt.cookie)).status).toBe(307);
    const before = await accountState();
    const second = await ticket(attempt.service);
    refused(await raw(callback(attempt.service, second), withVictim(attempt.cookie)));
    expect(await calls(second)).toHaveLength(0);
    expect(await accountState()).toEqual(before);
  });

  it("allows exactly one of two concurrent callbacks to validate CAS and sign in", async () => {
    await accountState();
    const attempt = await start();
    const ids = await Promise.all([ticket(attempt.service, "zz903"), ticket(attempt.service, "zz903")]);
    const responses = await Promise.all(ids.map((id) => raw(callback(attempt.service, id), attempt.cookie)));
    expect(responses.map((response) => response.location).sort()).toEqual([`${BASE}/hub`, `${BASE}${failedPage("expired")}`]);
    expect((await Promise.all(ids.map(calls))).flat()).toHaveLength(1);
    expect((await attempt.ref.get()).exists).toBe(false);
    for (const response of responses) privateResponse(response);
  });

  it("keeps a newer login usable after an old callback arrives with the new proof", async () => {
    await accountState();
    const older = await start("/scores");
    const newer = await start("/games");
    const oldTicket = await ticket(older.service);
    refused(await raw(callback(older.service, oldTicket), newer.cookie), failedPage("expired"));
    expect(await calls(oldTicket)).toHaveLength(0);
    expect((await newer.ref.get()).exists).toBe(true);
    const newTicket = await ticket(newer.service);
    const response = await raw(callback(newer.service, newTicket), newer.cookie);
    expect(response.status).toBe(307);
    expect(response.location).toBe(`${BASE}/games`);
  });

  it.each(["invalid-ticket", "wrong-service", "unavailable", "malformed"])("consumes/clears a bound attempt on %s while preserving the existing session and account data", async (mode) => {
    const before = await accountState();
    const attempt = await start();
    const id = mode === "invalid-ticket" ? "ST-not-issued" : await ticket(
      mode === "wrong-service" ? `${attempt.service}-different` : attempt.service,
      "zz901",
      mode === "unavailable" || mode === "malformed" ? mode : undefined,
    );
    const response = await raw(callback(attempt.service, id), withVictim(attempt.cookie));
    refused(response);
    cleared(response);
    expect((await attempt.ref.get()).exists).toBe(false);
    const callCount = (await calls(id)).length;
    expect(callCount).toBeGreaterThan(0);
    refused(await raw(callback(attempt.service, id), attempt.cookie), failedPage("expired"));
    expect(await calls(id)).toHaveLength(callCount);
    expect(await accountState()).toEqual(before);
  });

  it.each([
    ["invalid-ticket", "refused"],
    ["wrong-service", "refused"],
    ["unavailable", "unavailable"],
    ["malformed", "unavailable"],
  ])("explains %s to a browser without a session (%s)", async (mode, problem) => {
    await accountState();
    const attempt = await start();
    const id = mode === "invalid-ticket" ? "ST-not-issued" : await ticket(
      mode === "wrong-service" ? `${attempt.service}-different` : attempt.service,
      "zz901",
      mode === "unavailable" || mode === "malformed" ? mode : undefined,
    );
    const response = await raw(callback(attempt.service, id), attempt.cookie);
    refused(response, failedPage(problem));
    cleared(response);
  });

  it("signs in with CAS alone when the directory doesn't know the NetID: an account without name or email, no college", async () => {
    await accountState();
    const attempt = await start("/hub");
    const response = await raw(callback(attempt.service, await ticket(attempt.service, "zz909")), attempt.cookie);
    expect(response.location).toBe(`${BASE}/hub`);
    const token = response.cookies.find((cookie) => cookie.startsWith("token="))!.split(";")[0].slice(6);
    expect(jwt.verify(token, SECRET)).toMatchObject({ v: 2, userId: "netid-zz909", netid: "zz909" });
    expect((await db.doc(paths.user("netid-zz909")).get()).data()).toMatchObject({
      email: null, name: null, nameSource: "none", netid: "zz909", directory: { outcome: "not-found" },
    });
    const session = await api("GET", "/api/auth/session", undefined, { session: token });
    expect(session.body.viewer).toMatchObject({ userId: "netid-zz909", email: null, collegeId: null, canEditName: true });
    expect(session.body.viewer.name).toBe((await db.doc(paths.user("netid-zz909")).get()).data()!.username);
  });

  it("explains the problem on its page", async () => {
    const page = await raw(failedPage("expired"));
    expect(page.status).toBe(200);
    expect(page.body).toContain("Sign in again");
    expect(page.body).toContain("finished in another tab");
  });
});
