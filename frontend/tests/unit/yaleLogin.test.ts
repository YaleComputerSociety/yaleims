// The Yale login helpers (server/yaleLogin.ts), with CAS and Yalies stubbed.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { casLoginUrl, returnPath, validateTicket, yaliesProfile, yaliesProfilesByEmail } = await import("@/server/yaleLogin");

beforeEach(() => {
  process.env.BASE_URL = "https://yaleims.com";
  process.env.YALIES_API_KEY = "test-key";
});
afterEach(() => vi.unstubAllGlobals());

const answer = (body: string | object, status = 200) => {
  const fetch = vi.fn(async (_url: string, _init?: RequestInit) =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), { status })
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
};
const casSuccess = `<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas"><cas:authenticationSuccess><cas:user>abc123</cas:user></cas:authenticationSuccess></cas:serviceResponse>`;
const casFailure = `<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas"><cas:authenticationFailure code="INVALID_TICKET">no</cas:authenticationFailure></cas:serviceResponse>`;

describe("the CAS service URL", () => {
  it("is the same for login and the ticket check, including the attempt state", async () => {
    const state = "A".repeat(43);
    const loginService = new URL(casLoginUrl(state)).searchParams.get("service")!;
    expect(loginService).toBe(`https://yaleims.com/api/auth/redirect?state=${state}`);
    const comeback = new URL(loginService).searchParams.get("state")!;
    const fetch = answer(casSuccess);
    expect(await validateTicket("ST-1&x=2", comeback)).toBe("abc123");
    const checked = new URL(fetch.mock.calls[0][0] as string);
    expect(checked.origin + checked.pathname).toBe("https://secure.its.yale.edu/cas/serviceValidate");
    expect(checked.searchParams.get("ticket")).toBe("ST-1&x=2");
    expect(checked.searchParams.get("service")).toBe(loginService);
  });
  it("returns only to this site's pages, and uses Yale's test CAS on localhost:3000", () => {
    expect(returnPath("https://evil.example/x")).toBe("/");
    expect(returnPath("//evil.example")).toBe("/");
    expect(returnPath(null)).toBe("/");
    expect(returnPath("/games?sport=Flag Football&college=MC#today"))
      .toBe("/games?sport=Flag%20Football&college=MC#today");
    process.env.BASE_URL = "http://localhost:3000";
    expect(casLoginUrl("A".repeat(43))).toBe(
      "https://secure-tst.its.yale.edu/cas/login?service=" + encodeURIComponent(`http://localhost:3000/api/auth/redirect?state=${"A".repeat(43)}`)
    );
  });
});

describe("validateTicket", () => {
  it("is null when CAS refuses the ticket, and throws when CAS is down", async () => {
    answer(casFailure);
    expect(await validateTicket("ST-bad", "A".repeat(43))).toBeNull();
    answer("busy", 503);
    await expect(validateTicket("ST-1", "A".repeat(43))).rejects.toThrow("CAS answered 503");
  });
});

describe("yaliesProfile", () => {
  it("is the first match, or null when Yalies has none with an email", async () => {
    const fetch = answer([{ netid: "al1", email: "ada.l@yale.edu", first_name: "Ada", last_name: "L", college: "Morse" }]);
    expect(await yaliesProfile("AL1")).toEqual({ netid: "al1", email: "ada.l@yale.edu", first_name: "Ada", last_name: "L", college: "Morse" });
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: "POST", headers: { Authorization: "Bearer test-key" } });
    // An exact NetID filter, lowercased (Yalies matches case-sensitively).
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body)).filters).toEqual({ netid: "al1" });
    answer([]);
    expect(await yaliesProfile("nobody")).toBeNull();
    answer([{ first_name: "No", last_name: "Email" }]);
    expect(await yaliesProfile("x")).toBeNull();
  });
});

describe("yaliesProfilesByEmail", () => {
  it("looks a list of emails up in one call, by exact email", async () => {
    const fetch = answer([{ netid: "al1", email: "ada.l@yale.edu", first_name: "Ada", last_name: "L", college: "Morse" }]);
    const found = await yaliesProfilesByEmail(["ada.l@yale.edu", "gone@yale.edu"]);
    expect([...found.keys()]).toEqual(["ada.l@yale.edu"]);
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toMatchObject({ filters: { email: ["ada.l@yale.edu", "gone@yale.edu"] }, page_size: 2 });
  });
});
