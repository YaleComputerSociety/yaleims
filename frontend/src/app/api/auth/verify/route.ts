import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

interface DecodedToken {
  name: string;
  netid: string;
  email: string;
  role: string;
  username: string;
  college: string;
  points: string;
  matches_played: number;
}

function isValidDecodedToken(decoded: any): decoded is DecodedToken {
  return (
    typeof decoded === "object" &&
    typeof decoded.netid === "string" &&
    typeof decoded.email === "string"
  );
}

export async function GET(): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token");

    if (!token?.value) {
      return NextResponse.json({ isLoggedIn: false }, { status: 200 });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error("JWT_SECRET is not defined");
      return NextResponse.json({ isLoggedIn: false }, { status: 500 });
    }

    const decoded = jwt.verify(token.value, JWT_SECRET);

    if (!isValidDecodedToken(decoded)) {
      console.error("Invalid token structure");
      return NextResponse.json({ isLoggedIn: false }, { status: 401 });
    }

    return NextResponse.json({
      isLoggedIn: true,
      user: {
        name: decoded.name,
        netid: decoded.netid,
        email: decoded.email,
        role: decoded.role,
        username: decoded.username,
        college: decoded.college,
        points: decoded.points,
        matches_played: decoded.matches_played,        
      },
    });
  } catch (error) {
    console.error("Authentication error:", error);
    const response = NextResponse.json({ isLoggedIn: false }, { status: 401 });
    response.cookies.delete("token");
    return response;
  }
}