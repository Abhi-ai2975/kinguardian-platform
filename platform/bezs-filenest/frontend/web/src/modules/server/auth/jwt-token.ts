/**
 * server/auth/jwt-token — Fetch the BetterAuth JWT for server-side backend calls.
 *
 * Forwards the session cookie to the IAM's /api/auth/token endpoint to exchange
 * the session for a short-lived JWT. The JWT is then attached as a Bearer token
 * when calling the FileNest backend API.
 *
 * Only the cookie header is forwarded — passing all browser headers causes undici
 * to fail with "fetch failed" due to forbidden headers (connection, content-length).
 *
 * @module
 */
"server-only";

import { headers } from "next/headers";

export async function getAuthToken(): Promise<string> {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? "";

  const res = await fetch(`${process.env.BETTER_AUTH_URL}/api/auth/token`, {
    method: "GET",
    headers: { cookie },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch auth token: ${res.status}`);
  }

  const data = await res.json();
  const token: string | undefined =
    data.token ?? data.jwt ?? data.access_token;

  if (!token) {
    throw new Error("Auth token not found in IAM response");
  }

  return token;
}
