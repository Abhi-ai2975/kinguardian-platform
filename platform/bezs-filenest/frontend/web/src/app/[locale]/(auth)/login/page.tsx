/**
 * Login page — initiates the OAuth 2.1 PKCE flow with the IAM service.
 *
 * No credentials are collected here. The user authenticates entirely on the
 * IAM. This page generates PKCE material, stores it in localStorage for
 * the /callback page, then redirects to the IAM authorization endpoint.
 *
 * Flow:
 *  1. Generate a random state (CSRF) and code_verifier (PKCE).
 *  2. Persist both in localStorage.
 *  3. Redirect to IAM_URL/api/auth/oauth2/authorize.
 *
 * @module
 */
"use client";

import { useEffect } from "react";
import { FolderOpen } from "lucide-react";

/** Base64url-encodes an ArrayBuffer — no padding, URL-safe characters. */
function base64UrlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Generates a cryptographically random base64url string of the given byte length. */
function randomString(len: number): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return base64UrlEncode(arr.buffer);
}

/** Produces a PKCE S256 code challenge from the given verifier. */
async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64UrlEncode(digest);
}

/** Kicks off the PKCE authorization request on mount. */
export default function LoginPage() {
  useEffect(() => {
    async function initOAuth() {
      const iamUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const clientId = process.env.NEXT_PUBLIC_BETTER_AUTH_CLIENT_ID ?? "";

      const state = randomString(32);
      const verifier = randomString(64);
      const challenge = await codeChallenge(verifier);

      // Persist state and verifier so /callback can validate and exchange the code.
      localStorage.setItem("oauth_state", state);
      localStorage.setItem("oauth_code_verifier", verifier);

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `${appUrl}/callback`,
        response_type: "code",
        scope: "openid profile email offline_access",
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
      });

      window.location.href = `${iamUrl}/api/auth/oauth2/authorize?${params}`;
    }

    initOAuth();
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <FolderOpen className="h-5 w-5" />
      </div>
      <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
    </div>
  );
}
