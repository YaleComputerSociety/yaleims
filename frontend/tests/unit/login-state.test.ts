// Cookie transport and pre-session isolation; actual one-use storage is tested
// against Firestore by the login integration suite.
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { values, setCookie, create, take } = vi.hoisted(() => ({
  values: new Map<string, string>(), setCookie: vi.fn(), create: vi.fn(), take: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: (name: string) => values.has(name) ? { name, value: values.get(name) } : undefined,
  set: setCookie,
}) }));
vi.mock("@/server/data/loginAttempts", () => ({ createLoginAttempt: create, takeLoginAttempt: take }));
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

beforeEach(() => {
  vi.stubEnv("BASE_URL", "https://yaleims.com");
  values.clear();
  vi.clearAllMocks();
  create.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

async function login(production: boolean) {
  vi.stubEnv("NODE_ENV", production ? "production" : "development");
  vi.resetModules();
  return import("@/server/login");
}

describe("anonymous login state", () => {
  it.each([false, true])("sets and clears a separate host-only HttpOnly proof (production=%s)", async (production) => {
    const { startLogin, consumeLogin } = await login(production);
    const response = await startLogin("/games?college=MC#today");
    const service = new URL(new URL(response.headers.get("location")!).searchParams.get("service")!);
    const state = service.searchParams.get("state")!;
    const [name, proof, options] = setCookie.mock.calls[0];
    expect(name).toBe(production ? "__Host-yims_login" : "yims_login");
    expect(proof).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(proof).not.toBe(state);
    expect(service.searchParams.has("from")).toBe(false);
    expect(options).toEqual({ httpOnly: true, secure: production, sameSite: "lax", path: "/", maxAge: 600 });
    const [key, record] = create.mock.calls[0];
    expect(key).toBe(hash(state));
    expect(record).toEqual({ browserHash: hash(proof), from: "/games?college=MC#today", expiresAt: expect.anything() });
    expect(record.expiresAt.toMillis() - Date.now()).toBeGreaterThan(590_000);
    expect(record.expiresAt.toMillis() - Date.now()).toBeLessThanOrEqual(600_000);
    values.set(name, proof);
    take.mockResolvedValue({ ...record, expired: false });
    expect(await consumeLogin(state)).toBe("/games?college=MC#today");
    expect(take).toHaveBeenCalledWith(hash(state), hash(proof));
    expect(setCookie).toHaveBeenLastCalledWith(name, "", { ...options, maxAge: 0 });
  });

  it("does not clear another pending browser proof when the binding fails", async () => {
    const { consumeLogin } = await login(false);
    values.set("yims_login", "A".repeat(43));
    take.mockResolvedValue(null);
    await expect(consumeLogin("B".repeat(43))).rejects.toMatchObject({ status: 401 });
    expect(setCookie).not.toHaveBeenCalled();
  });

  it("clears a matching expired proof and refuses it before authentication", async () => {
    const { consumeLogin } = await login(false);
    values.set("yims_login", "A".repeat(43));
    take.mockResolvedValue({ from: "/hub", expired: true });
    await expect(consumeLogin("B".repeat(43))).rejects.toMatchObject({ status: 401 });
    expect(setCookie).toHaveBeenCalledWith("yims_login", "", expect.objectContaining({ maxAge: 0 }));
  });

  it.each(["/" + "x".repeat(2048), "/" + "é".repeat(800)])("bounds stored return paths before writing an attempt", async (from) => {
    const { startLogin } = await login(false);
    await expect(startLogin(from)).rejects.toMatchObject({ status: 400 });
    expect(create).not.toHaveBeenCalled();
    expect(setCookie).not.toHaveBeenCalled();
  });
});
