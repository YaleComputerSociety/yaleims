import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  const BASE_URL = process.env.BASE_URL as string;
  if (!BASE_URL) {
    throw new Error("Please define the BASE_URL environment variable");
  }
  const from = "/";
  const serviceUrl = `${BASE_URL}/api/auth/redirect?from=${from}`;
  const encodedServiceUrl = encodeURIComponent(serviceUrl);
  
  return NextResponse.redirect(
    `https://secure.its.yale.edu/cas/login?service=${encodedServiceUrl}`
  );
}
