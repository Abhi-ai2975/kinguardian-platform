/**
 * Signup page — initiates the OAuth 2.1 PKCE flow via the IAM signup screen.
 *
 * Generates the same PKCE material as the login page, stores it in
 * localStorage, then redirects to the IAM's sign-up page with the OAuth
 * authorization URL as `callbackURL`. After the user creates their account,
 * BetterAuth redirects them to the authorization endpoint which completes
 * the normal PKCE → /callback → token exchange → session cookie flow.
 *
 * Flow:
 *  1. Generate random state (CSRF) + code_verifier (PKCE).
 *  2. Persist both in localStorage (same keys as login).
 *  3. Build the authorization URL with all PKCE params.
 *  4. Redirect to: IAM_URL/sign-up?callbackURL=<authorization URL>
 *
 * @module
 */
"use client";

import { useEffect } from "react";
import { FolderOpen } from "lucide-react";

function base64UrlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomString(len: number): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return base64UrlEncode(arr.buffer);
}

async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64UrlEncode(digest);
}

export default function SignupPage() {
  useEffect(() => {
    async function initOAuth() {
      const iamUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const clientId = process.env.NEXT_PUBLIC_BETTER_AUTH_CLIENT_ID ?? "";

      const state = randomString(32);
      const verifier = randomString(64);
      const challenge = await codeChallenge(verifier);

      localStorage.setItem("oauth_state", state);
      localStorage.setItem("oauth_code_verifier", verifier);

      const authParams = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `${appUrl}/callback`,
        response_type: "code",
        scope: "openid profile email offline_access",
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
      });

      const authorizationUrl = `${iamUrl}/api/auth/oauth2/authorize?${authParams}`;

      window.location.href = `${iamUrl}/auth/sign-up?callbackURL=${encodeURIComponent(authorizationUrl)}`;
    }

    initOAuth();
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <FolderOpen className="h-5 w-5" />
      </div>
      <p className="text-sm text-muted-foreground">Redirecting to sign up…</p>
    </div>
  );
}
