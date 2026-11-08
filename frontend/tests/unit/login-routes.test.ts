// A valid CAS ticket must not replace a session unless this browser started login.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const { cookieValues, validateTicket, signIn, take } = vi.hoisted(() => ({
  cookieValues: new Map<string, string>(),
  validateTicket: vi.fn(), signIn: vi.fn(), take: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: (name: string) => cookieValues.has(name) ? { name, value: cookieValues.get(name) } : undefined,
  set: (name: string, value: string) => { cookieValues.set(name, value); },
}) }));
vi.mock("@/server/firebaseAdmin", () => ({ adminDb: {} }));
vi.mock("@/server/data/loginAttempts", () => ({ createLoginAttempt: vi.fn(), takeLoginAttempt: take }));
vi.mock("@/server/data/seasons", () => ({ getCurrentSeasonId: async () => "2026-2027" }));
vi.mock("@/server/services/accounts", () => ({ signIn }));
vi.mock("@/server/yaleLogin", async (actual) => ({
  ...await actual<typeof import("@/server/yaleLogin")>(), validateTicket,
}));

const { GET } = await import("@/app/api/auth/redirect/route");
const { setSessionCookie } = await import("@/server/session");

beforeEach(() => {
  process.env.BASE_URL = "https://yaleims.com";
  process.env.JWT_SECRET = "only-a-unit-test-secret";
  cookieValues.clear();
  vi.clearAllMocks();
  validateTicket.mockResolvedValue("zz901");
  signIn.mockResolvedValue("netid-zz901");
  take.mockResolvedValue({ from: "/hub", expired: false });
});

describe("browser-bound login callbacks", () => {
  it.each([
    "ticket=ST-attacker",
    `ticket=ST-attacker&state=${"A".repeat(43)}`,
    "ticket=ST-attacker&state=malformed",
    `ticket=ST-attacker&state=${"A".repeat(43)}&state=${"B".repeat(43)}`,
  ])("sends a signed-in browser home from an unsolicited callback, before CAS or account changes: %s", async (query) => {
    const existing = new NextResponse(null);
    setSessionCookie(existing, { userId: "victim@yale.edu", netid: "victim1" });
    cookieValues.set("token", existing.cookies.get("token")!.value);
    const response = await GET(new Request(`https://yaleims.com/api/auth/redirect?${query}`), { params: Promise.resolve({}) });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://yaleims.com/");
    expect(validateTicket).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie") ?? "").not.toContain("token=");
  });

  it("signs in with the NetID CAS vouched for, lowercased, whatever the directory knows", async () => {
    cookieValues.set("yims_login", "A".repeat(43));
    validateTicket.mockResolvedValue("ZZ901");
    const response = await GET(new Request(`https://yaleims.com/api/auth/redirect?state=${"B".repeat(43)}&ticket=ST-test`), { params: Promise.resolve({}) });
    expect(response.headers.get("location")).toBe("https://yaleims.com/hub");
    expect(signIn).toHaveBeenCalledWith("zz901", "2026-2027");
    expect(response.headers.get("set-cookie")).toContain("token=");
  });

  it.each([
    ["account-failure", "unavailable"],
  ])("never issues a session after %s, destroys the pre-session and explains it (%s)", async (failure, problem) => {
    cookieValues.set("yims_login", "A".repeat(43));
    signIn.mockRejectedValue(new Error("Account initialization failed"));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const response = await GET(new Request(`https://yaleims.com/api/auth/redirect?state=${"B".repeat(43)}&ticket=ST-test`), { params: Promise.resolve({}) });
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(`https://yaleims.com/sign-in-failed?problem=${problem}`);
      expect(errorLog).toHaveBeenCalledTimes(1);
      expect(response.headers.get("set-cookie") ?? "").not.toContain("token=");
      expect(cookieValues.get("yims_login")).toBe("");
      expect(take).toHaveBeenCalledOnce();
      expect(validateTicket).toHaveBeenCalledOnce();
      expect(signIn).toHaveBeenCalledOnce();
    } finally { errorLog.mockRestore(); }
  });
});
