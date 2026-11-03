"use client";
import { useEffect, useState } from "react";

/** The current time (ms), refreshed every minute: for pages that sort games into now, later and started. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
