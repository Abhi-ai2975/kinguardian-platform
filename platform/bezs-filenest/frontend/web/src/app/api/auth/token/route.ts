/**
 * POST /api/auth/token — server-side OAuth 2.1 token exchange.
 *
 * Receives the authorization code from the PKCE callback page and exchanges
 * it for tokens by forwarding to the IAM's /api/auth/oauth2/token endpoint.
 * The client secret never leaves the server.
 *
 * Request body:
 *   code          — authorization code from the IAM callback
 *   code_verifier — PKCE verifier matching the original challenge
 *   redirect_uri  — must match the redirect_uri used in the authorize request
 *
 * Response:
 *   IAM token payload + redirectUrl (defaults to /dashboard)
 *
 * @module
 */
import axios from "axios";
import { NextResponse } from "next/server";
import { getServerSession } from "@/modules/server/auth/get-session";

/**
 * Exchange an authorization code for tokens via the IAM OAuth2 endpoint.
 *
 * Forwards the request to the IAM with the client secret attached server-side,
 * then returns the token payload along with a post-login redirect URL.
 */
export async function POST(request: Request) {
  const { code, code_verifier, redirect_uri } = await request.json();

  const clientId = process.env.NEXT_PUBLIC_BETTER_AUTH_CLIENT_ID;
  const clientSecret = process.env.BETTER_AUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "OAuth credentials not configured" },
      { status: 500 },
    );
  }

  if (!code || !code_verifier || !redirect_uri) {
    return NextResponse.json(
      {
        error: "Missing required parameters: code, code_verifier, redirect_uri",
      },
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

  try {
    const tokenRes = await axios.post<Record<string, unknown>>(
      `${process.env.BETTER_AUTH_URL}/api/auth/oauth2/token`,
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
      },
    );

    // After token exchange the IAM sets the session cookie, so getServerSession()
    // returns the new session — use its role redirect URL if configured.
    const session = await getServerSession();

    return NextResponse.json({
      ...tokenRes.data,
      redirectUrl: session?.session.activeRoleRedirectUrl ?? "/dashboard",
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const body = error.response.data as Record<string, unknown>;
      return NextResponse.json(
        {
          error:
            (body.error_description as string) ??
            (body.error as string) ??
            "Token exchange failed",
        },
        { status: error.response.status },
      );
    }
    return NextResponse.json(
      { error: "Token exchange failed" },
      { status: 500 },
    );
  }
}
