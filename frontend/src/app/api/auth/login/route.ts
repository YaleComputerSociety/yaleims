import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  const BASE_URL = process.env.BASE_URL;
  if (!BASE_URL) {
    throw new Error("Please define the BASE_URL environment variable");
  }
  
  // Pass BASE_URL as the 'from' parameter so redirect knows where to send user
  const serviceUrl = `https://yaleims.com/api/auth/redirect?from=${encodeURIComponent(BASE_URL)}`;
  const encodedServiceUrl = encodeURIComponent(serviceUrl);
  
  return NextResponse.redirect(
    `https://secure.its.yale.edu/cas/login?service=${encodedServiceUrl}`
  );
}
