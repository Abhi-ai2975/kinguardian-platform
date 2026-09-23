/**
 * @module middleware/proxy
 * @description Next.js middleware — the request pipeline entry point.
 *              Runs on every matched request before route handlers.
 *
 * **Pipeline (in order):**
 * 1. **CORS** — reads dynamic allowed origins from registered OAuth clients
 *    (cached for 60s). Adds CORS headers for cross-origin API requests.
 *    Preflight `OPTIONS` requests return 200 immediately.
 * 2. **Admin auth guard** — (currently commented out) would redirect
 *    unauthenticated or non-superadmin users from `/admin/*` routes.
 * 3. **next-intl** — locale-based routing via `next-intl/middleware`.
 *    Extracts locale from URL and sets `x-next-intl-locale` header.
 * 4. **Pathname header** — exposes `x-pathname` for downstream use.
 *
 * **Matcher:** applies to `/api/*` and all non-static, non-internal paths.
 *
 * **Dynamic CORS:** The middleware fetches from `/api/internal/cors-origins`
 * (protected by `x-internal-secret`) with a 60-second in-memory cache.
 * Falls back to cached origins if the fetch fails.
 */

import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Matches /[locale]/admin and /[locale]/admin/* — locale segment is one or more non-slash chars
const ADMIN_PATTERN = /^\/[^/]+\/admin(\/|$)/;
const baseUrl = process.env.INTERNAL_URL || "https://iam.drgodly.com";
// ---------------------------------------------------------------------------
// Dynamic CORS origins — sourced from OAuth client redirect URIs in the DB.
// Middleware runs in Edge Runtime (no Prisma), so we fetch from an internal
// API route and cache the result for 60 s (matching oauth-client-origins TTL).
// ---------------------------------------------------------------------------
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;
const CORS_TTL_MS = 60_000;

let corsCache: { origins: Set<string>; ts: number } | null = null;

async function getAllowedOrigins(base: string): Promise<Set<string>> {
  if (corsCache && Date.now() - corsCache.ts < CORS_TTL_MS) {
    return corsCache.origins;
  }

  try {
    const headers: Record<string, string> = {};
    if (INTERNAL_SECRET) headers["x-internal-secret"] = INTERNAL_SECRET;

    const res = await fetch(`${base}/api/internal/cors-origins`, {
      headers,
      cache: "no-store",
    });

    if (res.ok) {
      const { origins } = (await res.json()) as { origins: string[] };
      corsCache = { origins: new Set(origins), ts: Date.now() };
      return corsCache.origins;
    }
  } catch {
    // If the fetch fails, fall back to whatever is cached (or empty set)
  }

  return corsCache?.origins ?? new Set();
}

function buildCorsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  /**
   * =========================
   * ✅ 1. Handle API (CORS)
   * =========================
   */
  if (pathname.startsWith("/api")) {
    const requestOrigin = req.headers.get("origin");
    console.log({ requestOrigin });
    if (requestOrigin) {
      const allowedOrigins = await getAllowedOrigins(baseUrl);
      console.log({ allowedOrigins });
      allowedOrigins.add("https://test.drgodly.com");
      if (allowedOrigins.has(requestOrigin)) {
        // Preflight
        if (req.method === "OPTIONS") {
          return new NextResponse(null, {
            status: 200,
            headers: buildCorsHeaders(requestOrigin),
          });
        }

        // Normal API request
        const res = NextResponse.next();
        for (const [k, v] of Object.entries(buildCorsHeaders(requestOrigin))) {
          res.headers.set(k, v);
        }
        return res;
      }
    }

    // No Origin header (same-origin / server-to-server) or origin not allowed —
    // let the request through without CORS headers.
    return NextResponse.next();
  }

  /**
   * =========================
   * ✅ 2. Admin auth guard
   * =========================
   */
  // if (ADMIN_PATTERN.test(pathname)) {
  //   const sessionRes = await fetch(`${baseUrl}/api/auth/get-session`, {
  //     headers: {
  //       cookie: req.headers.get("cookie") ?? "",
  //       "Cache-Control": "no-cache, no-store, must-revalidate",
  //     },
  //     cache: "no-store",
  //     credentials: "same-origin",
  //   });

  //   const session = sessionRes.ok ? await sessionRes.json() : null;

  //   if (!session?.user) {
  //     const signInUrl = new URL("/auth/sign-in", req.url);
  //     signInUrl.searchParams.set("callbackUrl", pathname);
  //     return NextResponse.redirect(signInUrl);
  //   }

  //   if (session.user.role !== "superadmin") {
  //     return NextResponse.redirect(new URL("/", req.url));
  //   }
  // }

  /**
   * =========================
   * ✅ 3. next-intl middleware
   * =========================
   */
  const intlResponse = intlMiddleware(req);

  // Important: respect rewrites/redirects from next-intl
  if (!intlResponse.ok) {
    return intlResponse;
  }

  /**
   * Extract locale + pathname AFTER intl rewrite
   */
  const rewrittenPath =
    intlResponse.headers.get("x-middleware-rewrite") || req.url;

  const [, locale, ...rest] = new URL(rewrittenPath).pathname.split("/");
  const cleanPathname = "/" + rest.join("/");

  /**
   * Optional: expose headers (like your old middleware)
   */
  const res = NextResponse.next();
  res.headers.set("x-pathname", cleanPathname);
  res.headers.set("x-next-intl-locale", locale);

  return res;
}

/**
 * =========================
 * ✅ Matcher
 * =========================
 */
export const config = {
  matcher: [
    "/api/:path*",
    /*
     * Apply to everything EXCEPT:
     * - static files
     * - next internals
     */
    "/((?!_next|_vercel|.*\\..*).*)",
  ],
};
