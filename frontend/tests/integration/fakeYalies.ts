// A stand-in for the Yale directory (Yalies) during the integration tests:
// scripts/test-integration.mts serves it and points the app at it
// (YALIES_API_URL), so the tests never reach the real directory. Its people
// are made up and have no account in the seed.
import { createServer, type Server } from "node:http";

export const FAKE_PEOPLE = [
  { netid: "zz901", email: "zoe.zane@yale.edu", first_name: "Zoe", last_name: "Zane", college: "Benjamin Franklin College" },
  { netid: "zz902", email: "zack.zed@yale.edu", first_name: "Zack", last_name: "Zed", college: "Morse College" },
  { netid: "zz903", email: "zia.zorn@yale.edu", first_name: "Zia", last_name: "Zorn", college: "Benjamin Franklin College" },
];

/** A NetID the directory "can't be reached" for: it answers 503. */
export const UNREACHABLE_NETID = "zz999";

/** Serves POST /people like Yalies: exact-match filters (a list matches any value), people with those values. */
export function serveFakeYalies(port: number): Promise<Server> {
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const { filters = {} } = JSON.parse(body || "{}") as { filters?: Record<string, string | string[]> };
      if (filters.netid === UNREACHABLE_NETID) {
        res.writeHead(503).end();
        return;
      }
      const people = FAKE_PEOPLE.filter((p) =>
        Object.entries(filters).every(([field, value]) =>
          (Array.isArray(value) ? value : [value]).includes((p as Record<string, string>)[field])
        )
      );
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(people));
    });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}
