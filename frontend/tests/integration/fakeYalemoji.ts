// A stand-in for Yalemoji's API during the integration tests and the browser
// checks: scripts/test-integration.mts serves it and points the app at it
// (YALEMOJI_API_URL, key "fake"). It answers GET /api/v1/users/<netid> from
// a table that a test changes with POST /__set { netid, avatar }:
//   avatar: { version, png_url, … } → 200, as Yalemoji answers
//   avatar: null (or never set)      → 404, "hasn't made one"
//   avatar: "down"                   → 503, Yalemoji unreachable
import { createServer, type Server } from "node:http";

export const FAKE_YALEMOJI_KEY = "fake";

type Answer = Record<string, unknown> | "down";

export function serveFakeYalemoji(port: number): Promise<Server> {
  const answers = new Map<string, Answer>();
  const server = createServer(async (req, res) => {
    const url = new URL(req.url!, `http://127.0.0.1:${port}`);
    if (req.method === "POST" && url.pathname === "/__set") {
      let body = "";
      for await (const chunk of req) body += chunk;
      const { netid, avatar } = JSON.parse(body) as { netid: string; avatar: Answer | null };
      if (avatar === null) answers.delete(netid);
      else answers.set(netid, avatar);
      res.writeHead(204).end();
      return;
    }
    const netid = url.pathname.match(/^\/api\/v1\/users\/([^/]+)$/)?.[1];
    if (req.method !== "GET" || !netid) {
      res.writeHead(404).end();
      return;
    }
    if (req.headers.authorization !== `Bearer ${FAKE_YALEMOJI_KEY}`) {
      res.writeHead(401, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "missing_api_key" }));
      return;
    }
    const answer = answers.get(decodeURIComponent(netid));
    if (answer === "down") res.writeHead(503).end();
    else if (!answer) res.writeHead(404, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "not_found" }));
    else res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ netid, avatar: answer }));
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

/** Sets what the fake answers for `netid` (YALEMOJI_API_URL: the fake's origin). */
export async function setFakeYalemoji(netid: string, avatar: Answer | null): Promise<void> {
  const res = await fetch(`${process.env.YALEMOJI_API_URL}/__set`, { method: "POST", body: JSON.stringify({ netid, avatar }) });
  if (!res.ok) throw new Error(`The fake Yalemoji answered ${res.status}`);
}
