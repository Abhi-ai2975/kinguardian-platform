// POST /api/auth/token — server-side OAuth 2.1 authorization_code exchange.
//
// The client_secret never leaves the server. On success, the access_token is
// stored as an httpOnly cookie so getServerSession() can use it as a Bearer
// token on subsequent requests to IAM.
//
// This route handler takes precedence over the /api/auth/* rewrite in
// next.config.ts because filesystem routes are resolved before afterFiles
// rewrites in Next.js App Router.
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { code, code_verifier, redirect_uri } = await request.json();

  const clientId = process.env.NEXT_PUBLIC_CONSOLE_CLIENT_ID;
  const clientSecret = process.env.CONSOLE_CLIENT_SECRET;
  const iamUrl = process.env.IAM_URL ?? "http://localhost:5000";

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "OAuth credentials are not configured on this server." },
      { status: 500 },
    );
  }

  if (!code || !code_verifier || !redirect_uri) {
    return NextResponse.json(
      { error: "Missing required parameters: code, code_verifier, redirect_uri." },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    code_verifier,
    redirect_uri,
  });

  const tokenRes = await fetch(`${iamUrl}/api/auth/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok) {
    return NextResponse.json(
      {
        error:
          tokenData.error_description ??
          tokenData.error ??
          "Token exchange failed.",
      },
      { status: tokenRes.status },
    );
  }

  const response = NextResponse.json({ redirectUrl: "/overview" });

  // Store the access_token as an httpOnly cookie so the server can use it
  // as a Bearer token when calling IAM's userinfo/get-session endpoints.
  if (tokenData.access_token) {
    const maxAge = tokenData.expires_in ?? 60 * 60 * 24 * 7;
    response.cookies.set("console.access_token", tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });
  }

  return response;
}
