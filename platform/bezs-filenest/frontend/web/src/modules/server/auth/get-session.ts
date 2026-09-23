/**
 * modules/server/auth/get-session — Reads the active session from the IAM.
 *
 * Forwards the browser's cookie header to the IAM's /api/auth/get-session
 * endpoint and returns the session or null if not authenticated.
 *
 * This function is safe to call from any Server Component, Server Action, or
 * Route Handler. It must NOT be called from Client Components.
 *
 * Usage:
 *   const session = await getServerSession();
 *   if (!session) redirect({ href: "/login", locale });
 *
 * @module
 */
import { headers } from "next/headers";
import type { AuthResponse } from "./types";

/**
 * Retrieve the current server-side session by proxying the cookie to the IAM.
 *
 * Returns the full AuthResponse (user + session) or null if the request
 * carries no valid session cookie.
 */
export async function getServerSession(): Promise<AuthResponse | null> {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? "";

  let res: Response;
  try {
    res = await fetch(`${process.env.BETTER_AUTH_URL}/api/auth/get-session`, {
      headers: { cookie },
      cache: "no-store",
    });
  } catch {
    // IAM unreachable (e.g. not running locally) — treat as unauthenticated.
    return null;
  }

  if (!res.ok) return null;

  return res.json();
}
