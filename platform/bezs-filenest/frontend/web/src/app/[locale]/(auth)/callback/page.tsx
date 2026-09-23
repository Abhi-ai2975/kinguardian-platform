/**
 * OAuth 2.1 PKCE callback page — validates the state returned by IAM and
 * exchanges the authorization code for tokens via /api/auth/token.
 *
 * Flow:
 *  1. Read code and state from the query string.
 *  2. Validate state against localStorage (CSRF check).
 *  3. POST /api/auth/token with code + PKCE verifier.
 *  4. On success, clear localStorage and redirect to the dashboard.
 *  5. On failure, render an error card with a back-to-login button.
 *
 * @module
 */
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FolderOpen } from "lucide-react";

/** Inner component — reads search params after Suspense boundary resolves. */
function CallbackContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      setError("No authorization code returned from the identity provider.");
      return;
    }

    // CSRF check — state must match what was stored before the redirect.
    const savedState = localStorage.getItem("oauth_state");
    if (!savedState || state !== savedState) {
      setError("State parameter mismatch — possible CSRF. Please try again.");
      return;
    }

    const codeVerifier = localStorage.getItem("oauth_code_verifier");
    if (!codeVerifier) {
      setError("PKCE verifier not found. Please try signing in again.");
      return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

    fetch("/api/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        redirect_uri: `${appUrl}/callback`,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Token exchange failed. Please try again.");
          return;
        }
        // Clean up PKCE artifacts before redirecting.
        localStorage.removeItem("oauth_state");
        localStorage.removeItem("oauth_code_verifier");
        window.location.href = data.redirectUrl ?? "/dashboard";
      })
      .catch(() => {
        setError("Network error during token exchange. Please try again.");
      });
  }, [searchParams]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
          <FolderOpen className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium">Sign in failed</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground"
          onClick={() => (window.location.href = "/login")}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <FolderOpen className="h-5 w-5" />
      </div>
      <p className="text-sm text-muted-foreground">Completing sign in…</p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FolderOpen className="h-5 w-5" />
          </div>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
