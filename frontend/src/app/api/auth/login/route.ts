import { route } from "@/server/http";
import { startLogin } from "@/server/login";

/** Sends the visitor to Yale CAS; after login they come back to ?from (a page of this site). */
export const GET = route(async (req) => startLogin(new URL(req.url).searchParams.get("from")));
