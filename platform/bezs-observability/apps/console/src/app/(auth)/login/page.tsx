// Login page — initiates OAuth 2.1 PKCE flow with the IAM service.
// No credentials are collected here; the user authenticates on IAM directly.
"use client";

import { useEffect } from "react";
import { Activity } from "lucide-react";

function base64UrlEncode(buf: ArrayBuffer) {
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

export default function LoginPage() {
  useEffect(() => {
    async function initOAuth() {
      const iamUrl =
        process.env.NEXT_PUBLIC_IAM_URL ?? "http://localhost:5000";
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
      const clientId = process.env.NEXT_PUBLIC_CONSOLE_CLIENT_ID ?? "";

      const state = randomString(32);
      const verifier = randomString(64);
      const challenge = await codeChallenge(verifier);

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
        <Activity className="h-5 w-5" />
      </div>
      <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
    </div>
  );
}
