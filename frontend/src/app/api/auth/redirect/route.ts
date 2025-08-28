import { NextResponse } from "next/server";
import { parseString } from "xml2js";
import jwt from "jsonwebtoken";

export async function GET(request: Request): Promise<NextResponse> {
  const BASE_URL = process.env.BASE_URL as string;
  if (!BASE_URL) {
    throw new Error("Please define the BASE_URL environment variable");
  }
  const JWT_SECRET = process.env.JWT_SECRET as string;
  if (!JWT_SECRET) {
    throw new Error("Please define the JWT_SECRET environment variable");
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
    const ticketQuery = `https://secure.its.yale.edu/cas/serviceValidate?ticket=${ticket}&service=${encodedServiceUrl}`;
    
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

      const response1 = await fetch(
        "https://us-central1-yims-125a2.cloudfunctions.net/fetchOrAddUser",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, seasonId: "2025-2026" }),
        }
      );
      const result1 = await response1.json();
      const token = jwt.sign({ 
        name,
        netid,
        email, 
        role: result1.user.role,
        username: result1.user.username,
        college: result1.user.college,
        points: result1.user.points,
        matches_played: result1.user.matches_played,
      }, JWT_SECRET, {
        expiresIn: "7d",
      });

      const redirectPath = from && from.includes("/profile") ? "/profile" : "/";

      const redirectResponse = NextResponse.redirect(`${BASE_URL}${redirectPath}`);
      redirectResponse.cookies.set("token", token, {
        secure: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: true,
        sameSite: "none",
      });

      return redirectResponse;
    } catch (e) {
      return NextResponse.json({ error: "Authentication failed: " + e }, { status: 401 });
    }
  } else {
    const serviceUrl = `${BASE_URL}/api/auth/redirect?from=${from}`;
    const encodedServiceUrl = encodeURIComponent(serviceUrl);
    return NextResponse.redirect(
      `https://secure.its.yale.edu/cas/login?service=${encodedServiceUrl}`
    );
  }
}
