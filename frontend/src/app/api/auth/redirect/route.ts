import { NextResponse } from "next/server";
import { parseString } from "xml2js";
import { setSessionCookie } from "@/server/session";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { signIn } from "@/server/services/accounts";
import { safeReturnPath } from "@/lib/returnPath";

export async function GET(request: Request): Promise<NextResponse> {
  const BASE_URL = process.env.BASE_URL;
  if (!BASE_URL) {
    throw new Error("Please define the BASE_URL environment variable");
  }
  const YALIES_API_KEY = process.env.YALIES_API_KEY as string;
  if (!YALIES_API_KEY) {
    throw new Error("Please define the YALIES_API_KEY environment variable");
  }
  const { searchParams } = new URL(request.url);
  const ticket = searchParams.get("ticket");
  const from = searchParams.get("from") || "/";

  if (ticket) {
    const serviceUrl = `${BASE_URL}/api/auth/redirect?from=${from}`;
    const encodedServiceUrl = encodeURIComponent(serviceUrl);

    let ticketQuery;
    if (BASE_URL === "http://localhost:3000") {
      ticketQuery = `https://secure-tst.its.yale.edu/cas/serviceValidate?ticket=${ticket}&service=${encodedServiceUrl}`;
    } else {
      ticketQuery = `https://secure.its.yale.edu/cas/serviceValidate?ticket=${ticket}&service=${encodedServiceUrl}`;
    }
    const response = await fetch(ticketQuery);
    const xml = await response.text();

    const result: any = await new Promise((resolve, reject) => {
      parseString(xml, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

    try {
      if (result["cas:serviceResponse"]["cas:authenticationFailure"]) {
        return NextResponse.json({ error: "Authentication failed, early" }, { status: 401 });
      }
      const success = result["cas:serviceResponse"]["cas:authenticationSuccess"];

      if (!success) {
        return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
      }
      const netid = success[0]["cas:user"][0];

      const yaliesURL = "https://api.yalies.io/v2/people";
      const yaliesResponse = await fetch(yaliesURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + YALIES_API_KEY,
        },
        body: JSON.stringify({ filters: { netid } }),
      });
      const yaliesJSON = await yaliesResponse.json();
      const profile = yaliesJSON[0];
      const email = profile.email;
      const name = `${profile.first_name} ${profile.last_name}`;

      const currentSeasonId = await getCurrentSeasonId();
      if (!currentSeasonId) {
        throw new Error("Current season is missing");
      }

      // The first login creates the user; the first of a season, their player doc.
      const account = await signIn(profile, currentSeasonId);
      // Only pages on this site (no open redirect to other sites).
      const redirectTo = `${BASE_URL.replace(/\/$/, "")}${safeReturnPath(from, BASE_URL)}`;
      const redirectResponse = NextResponse.redirect(redirectTo);
      setSessionCookie(redirectResponse, { name, netid, email, ...account });

      return redirectResponse;
    } catch (e) {
      return NextResponse.json({ error: "Authentication failed: " + e }, { status: 401 });
    }
  } else {
    const serviceUrl = `${BASE_URL}/api/auth/redirect?from=${encodeURIComponent(safeReturnPath(from, BASE_URL))}`;
    const encodedServiceUrl = encodeURIComponent(serviceUrl);
    
    if (BASE_URL === "http://localhost:3000") {
      return NextResponse.redirect(
        `http://secure-tst.its.yale.edu/cas/login?service=${encodedServiceUrl}`
      );
    }

    return NextResponse.redirect(
      `https://secure.its.yale.edu/cas/login?service=${encodedServiceUrl}`
    );
  }
}
