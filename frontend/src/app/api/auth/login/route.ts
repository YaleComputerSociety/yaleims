import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  const BASE_URL = process.env.BASE_URL;
  if (!BASE_URL) {
    throw new Error("Please define the BASE_URL environment variable");
  }
  const from = "/";
  const serviceUrl = `${BASE_URL}/api/auth/redirect?from=${from}`;
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
