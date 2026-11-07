// Local CAS ticket validator for the integration harness. The app still builds
// Yale's real service URLs; casFetch.mjs redirects only its test process's fetches.
import { randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";

interface Ticket {
  netid: string;
  service: string;
  mode?: "unavailable" | "malformed";
}

export function serveFakeCas(port: number): Promise<Server> {
  const tickets = new Map<string, Ticket>();
  const calls: { ticket: string; service: string }[] = [];
  const xml = (content: string) => `<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">${content}</cas:serviceResponse>`;
  const failure = xml('<cas:authenticationFailure code="INVALID_TICKET">Invalid ticket or service</cas:authenticationFailure>');
  const server = createServer(async (req, res) => {
    const url = new URL(req.url!, `http://127.0.0.1:${port}`);
    if (req.method === "POST" && url.pathname === "/tickets") {
      try {
        let body = "";
        for await (const chunk of req) body += chunk;
        const ticket = JSON.parse(body) as Ticket;
        if (!/^[a-z][a-z0-9]{1,15}$/.test(ticket.netid) || typeof ticket.service !== "string") throw new Error("Invalid fixture");
        const id = `ST-${randomBytes(16).toString("hex")}`;
        tickets.set(id, ticket);
        res.writeHead(201, { "Content-Type": "application/json" }).end(JSON.stringify({ ticket: id }));
      } catch { res.writeHead(400).end(); }
      return;
    }
    if (req.method === "GET" && url.pathname === "/calls") {
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(calls));
      return;
    }
    if (req.method === "GET" && url.pathname === "/serviceValidate") {
      const id = url.searchParams.get("ticket") ?? "";
      const service = url.searchParams.get("service") ?? "";
      const ticket = tickets.get(id);
      tickets.delete(id); // CAS tickets are good for only one validation attempt.
      calls.push({ ticket: id, service });
      if (ticket?.mode === "unavailable") { res.writeHead(503).end("Test CAS unavailable"); return; }
      res.writeHead(200, { "Content-Type": "application/xml" }).end(ticket?.mode === "malformed" ? "<broken"
        : ticket && ticket.service === service
          ? xml(`<cas:authenticationSuccess><cas:user>${ticket.netid}</cas:user></cas:authenticationSuccess>`)
          : failure);
      return;
    }
    res.writeHead(404).end();
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}
