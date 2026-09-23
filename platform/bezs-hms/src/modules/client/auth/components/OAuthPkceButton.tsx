"use client";

import { Button } from "@/components/ui/button";
import { ComponentProps } from "react";

type OAuthPkceButtonProps = ComponentProps<typeof Button>;

export function OAuthPkceButton({ children, ...props }: OAuthPkceButtonProps) {
  const base64UrlEncode = (buf: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const generateRandomString = (len: number) => {
    const arr = new Uint8Array(len);
    window.crypto.getRandomValues(arr);
    return base64UrlEncode(arr.buffer);
  };

  async function handleAuth() {
    const clientId = process.env.NEXT_PUBLIC_BETTER_AUTH_CLIENT_ID;
    const authUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!clientId || !authUrl || !appUrl) return;

    const state = generateRandomString(32);
    localStorage.setItem("oauth_state", state);

    const codeVerifier = generateRandomString(64);
    localStorage.setItem("oauth_code_verifier", codeVerifier);

    const digest = await window.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(codeVerifier),
    );
    const codeChallenge = base64UrlEncode(digest);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${appUrl}/callback`,
      response_type: "code",
      scope: "openid profile email offline_access",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    window.location.href = `${authUrl}/api/auth/oauth2/authorize?${params}`;
  }

  return (
    <Button onClick={handleAuth} {...props}>
      {children}
    </Button>
  );
}
