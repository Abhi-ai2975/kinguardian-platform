/**
 * Verify email page — forwards the token query param from the IAM verification
 * email to the IAM verify-email screen to complete the email verification flow.
 *
 * @module
 */
"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FolderOpen } from "lucide-react";

function VerifyRedirect() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    const iamUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "";
    // Preserve the token so IAM can verify the email address.
    const dest = token
      ? `${iamUrl}/verify-email?token=${token}`
      : `${iamUrl}/verify-email`;
    window.location.href = dest;
  }, [token]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <FolderOpen className="h-5 w-5" />
      </div>
      <p className="text-sm text-muted-foreground">Redirecting…</p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <VerifyRedirect />
    </Suspense>
  );
}
