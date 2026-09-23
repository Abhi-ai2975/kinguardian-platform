/**
 * OAuth 2.1 PKCE callback page — validates the `state` parameter returned by
 * IAM and exchanges the authorization `code` for tokens via the server-side
 * /api/auth/token route.
 *
 * Flow:
 *  1. Read `code` and `state` from the query string.
 *  2. Validate `state` against the value stored in localStorage (CSRF check).
 *  3. POST to /api/auth/token with the code and PKCE verifier.
 *  4. On success, clear localStorage and redirect to the role-based dashboard URL.
 *  5. On failure, render an error UI with a back-to-login button.
 */
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Handles the actual PKCE callback logic after Suspense resolves search params. */
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
        // Clean up PKCE/state artifacts before redirecting.
        localStorage.removeItem("oauth_state");
        localStorage.removeItem("oauth_code_verifier");
        window.location.href = data.redirectUrl ?? "/";
      })
      .catch(() => {
        setError("Network error during token exchange. Please try again.");
      });
  }, [searchParams]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
          <HeartPulse className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium">Sign in failed</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          onClick={() => (window.location.href = "/login")}
        >
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <HeartPulse className="h-5 w-5" />
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
            <HeartPulse className="h-5 w-5" />
          </div>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
