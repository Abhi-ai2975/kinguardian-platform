/**
 * Signup page — account creation is handled entirely by the IAM service.
 * This page immediately redirects the user to the IAM sign-up screen.
 */
"use client";

import { useEffect } from "react";
import { HeartPulse } from "lucide-react";

/** Redirects to the IAM sign-up page on mount. */
export default function SignupPage() {
  useEffect(() => {
    const iamUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "";
    window.location.href = `${iamUrl}/sign-up`;
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <HeartPulse className="h-5 w-5" />
      </div>
      <p className="text-sm text-muted-foreground">Redirecting to sign up…</p>
    </div>
  );
}
