/**
 * The page to return to after login: `from` if it resolves to this site
 * (same origin as `baseUrl`), as path + query + hash; otherwise "/".
 * Stops the login flow from redirecting to other sites (open redirect).
 */
export function safeReturnPath(from: string | null, baseUrl: string): string {
  try {
    const base = new URL(baseUrl);
    const url = new URL(from || "/", base);
    if (url.origin === base.origin) return url.pathname + url.search + url.hash;
  } catch {
    // unparsable `from` or base: fall through
  }
  return "/";
}
