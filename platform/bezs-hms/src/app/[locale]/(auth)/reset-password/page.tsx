/**
 * Reset password page — password reset is handled by the IAM service.
 * Forwards the `token` query param (from the IAM email link) to the IAM
 * reset-password screen so the user can set a new password.
 */
"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { HeartPulse } from "lucide-react";

/** Reads the reset token from the URL and redirects to IAM with it. */
function ResetRedirect() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    const iamUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "";
    // Preserve the token so IAM can validate the reset request.
    const dest = token
      ? `${iamUrl}/reset-password?token=${token}`
      : `${iamUrl}/reset-password`;
    window.location.href = dest;
  }, [token]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <HeartPulse className="h-5 w-5" />
      </div>
      <p className="text-sm text-muted-foreground">Redirecting…</p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">Loading…</p>
      }
    >
      <ResetRedirect />
    </Suspense>
  );
}
