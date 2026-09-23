/**
 * OAuth2 token exchange endpoint.
 *
 * Receives an authorization code from the client (after PKCE flow) and exchanges
 * it for an access token by forwarding the request to Better Auth's OAuth2 token
 * endpoint. The active role redirect URL from the current session is appended to
 * the response so the client knows where to navigate after sign-in.
 */

import axios from "axios";
import { NextResponse } from "next/server";
import { getServerSession } from "@/modules/server/auth/get-session";

/**
 * POST /api/auth/token
 *
 * @body code          - The authorization code received from the OAuth2 callback.
 * @body code_verifier - The PKCE code verifier matching the original challenge.
 * @body redirect_uri  - The redirect URI used in the original authorization request.
 *
 * @returns The Better Auth token response merged with the session's redirect URL,
 *          or an error JSON with the appropriate HTTP status.
 */
export async function POST(request: Request) {
  const { code, code_verifier, redirect_uri } = await request.json();
  const session = await getServerSession();

  const clientId = process.env.NEXT_PUBLIC_BETTER_AUTH_CLIENT_ID;
  const clientSecret = process.env.BETTER_AUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Missing OAuth credentials" },
      { status: 500 }
    );
  }

  if (!code || !code_verifier || !redirect_uri) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  // Build the URL-encoded form body required by the OAuth2 token endpoint.
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
      `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/auth/oauth2/token`,
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
      }
    );

    return NextResponse.json({
      ...tokenRes.data,
      // Append the role-based redirect URL so the client can navigate post-login.
      redirectUrl: session?.session.activeRoleRedirectUrl,
    });
  } catch (error) {
    // Axios throws on non-2xx — extract the error payload from the response.
    if (axios.isAxiosError(error) && error.response) {
      const body = error.response.data as Record<string, unknown>;
      return NextResponse.json(
        {
          error:
            body.error_description ??
            body.error ??
            "Token exchange failed",
        },
        { status: error.response.status }
      );
    }
    return NextResponse.json({ error: "Token exchange failed" }, { status: 500 });
  }
}
