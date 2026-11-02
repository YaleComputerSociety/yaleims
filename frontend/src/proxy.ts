// Runs before every API request (Next.js "proxy", formerly middleware).
//
// Cross-site request forgery guard: a request that changes something (any
// method but GET/HEAD/OPTIONS) must come from one of our own pages. Browsers
// send the page's Origin with such requests, and another site can't fake it,
// so the Origin's host has to be the host the request was sent to (the same
// check Next.js applies to Server Actions). Requests without an Origin are
// refused too: every browser sends one on these methods.
import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api/core";

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  // Behind App Hosting's load balancer the public host is in x-forwarded-host
  // (a proxy chain can list several; the first is the client's).
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host"))?.split(",")[0].trim();
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function proxy(req: NextRequest) {
  if (SAFE_METHODS.includes(req.method) || isSameOrigin(req)) {
    return NextResponse.next();
  }
  const refusal = new ApiError("forbidden", "Cross-site request refused");
  return NextResponse.json(refusal.toBody(), { status: refusal.status });
}

export const config = { matcher: "/api/:path*" };
