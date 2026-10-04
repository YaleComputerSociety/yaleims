import { NextResponse } from "next/server";
import { parseString } from "xml2js";
import { functionUrl } from "@/utils/functionUrls";
import { setSessionCookie } from "@/server/session";
import { getCurrentSeason } from "@/server/data/seasons";

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
      const email = yaliesJSON[0].email;
      const name = `${yaliesJSON[0].first_name} ${yaliesJSON[0].last_name}`;

      const currentSeasonId = (await getCurrentSeason())?.year;
      if (!currentSeasonId) {
        throw new Error("Current season is missing");
      }

      const response1 = await fetch(
        functionUrl("fetchOrAddUser"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, seasonId: currentSeasonId }),
        }
      );
      const result1 = await response1.json();
      const redirectTo = from.startsWith("http") ? from : `${BASE_URL.replace(/\/$/, "")}${from.startsWith("/") ? from : "/" + from}`;
      const redirectResponse = NextResponse.redirect(redirectTo);
      // Defaults matter: jwt.sign drops undefined values, and user docs carry no
      // role/matches_played, so without them the token ships incomplete.
      setSessionCookie(redirectResponse, {
        name,
        netid,
        email,
        role: result1.user.role ?? "user",
        mRoles: result1.user.mRoles ?? ["user"],
        username: result1.user.username ?? "Anonymous",
        college: result1.user.college ?? "",
        matches_played: result1.user.matches_played ?? 0,
      });

      return redirectResponse;
    } catch (e) {
      return NextResponse.json({ error: "Authentication failed: " + e }, { status: 401 });
    }
  } else {
    const serviceUrl = `${BASE_URL}/api/auth/redirect?from=${encodeURIComponent(from)}`;
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
