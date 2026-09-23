// proxy.ts — lightweight Edge middleware that guards all dashboard routes.
//
// Checks for either a better-auth session cookie (direct IAM proxy flow)
// or the OAuth access_token cookie (PKCE flow). Full DB-backed validation
// happens in DashboardLayout; this only needs to confirm a token exists.
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/callback",
  "/docs",
  "/about",
  "/privacy",
  "/terms",
  "/security",
  "/api/auth",
  "/api/docs",
  "/_next",
  "/favicon",
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const sessionCookie =
    req.cookies.get("better-auth.session_token") ??
    req.cookies.get("__Secure-better-auth.session_token");

  // Also accept the OAuth access_token cookie set by /api/auth/token after PKCE flow.
  const oauthCookie = req.cookies.get("console.access_token");

  if (!sessionCookie && !oauthCookie) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
