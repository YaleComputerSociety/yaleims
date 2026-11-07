// A valid CAS ticket must not replace a session unless this browser started login.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const { cookieValues, validateTicket, profile, signIn, take } = vi.hoisted(() => ({
  cookieValues: new Map<string, string>(),
  validateTicket: vi.fn(), profile: vi.fn(), signIn: vi.fn(), take: vi.fn(),
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
  ...await actual<typeof import("@/server/yaleLogin")>(), validateTicket, yaliesProfile: profile,
}));

const { GET } = await import("@/app/api/auth/redirect/route");
const { setSessionCookie } = await import("@/server/session");

beforeEach(() => {
  process.env.BASE_URL = "https://yaleims.com";
  process.env.JWT_SECRET = "only-a-unit-test-secret";
  cookieValues.clear();
  vi.clearAllMocks();
  validateTicket.mockResolvedValue("zz901");
  profile.mockResolvedValue({ email: "zoe.zane@yale.edu", first_name: "Zoe", last_name: "Zane", college: "BF" });
  signIn.mockResolvedValue(undefined);
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
    expect(profile).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie") ?? "").not.toContain("token=");
  });

  it.each([
    ["no-profile", "no-profile"],
    ["non-Yale-profile", "no-profile"],
    ["account-failure", "unavailable"],
  ])("never issues a session after %s, destroys the pre-session and explains it (%s)", async (failure, problem) => {
    cookieValues.set("yims_login", "A".repeat(43));
    if (failure === "no-profile") profile.mockResolvedValue(null);
    if (failure === "non-Yale-profile") profile.mockResolvedValue({ email: "person@elsewhere.edu" });
    if (failure === "account-failure") signIn.mockRejectedValue(new Error("Account initialization failed"));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const response = await GET(new Request(`https://yaleims.com/api/auth/redirect?state=${"B".repeat(43)}&ticket=ST-test`), { params: Promise.resolve({}) });
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(`https://yaleims.com/sign-in-failed?problem=${problem}`);
      expect(errorLog).toHaveBeenCalledTimes(failure === "account-failure" ? 1 : 0);
      expect(response.headers.get("set-cookie") ?? "").not.toContain("token=");
      expect(cookieValues.get("yims_login")).toBe("");
      expect(take).toHaveBeenCalledOnce();
      expect(validateTicket).toHaveBeenCalledOnce();
      if (failure === "account-failure") expect(signIn).toHaveBeenCalledOnce();
      else expect(signIn).not.toHaveBeenCalled();
    } finally { errorLog.mockRestore(); }
  });
});
