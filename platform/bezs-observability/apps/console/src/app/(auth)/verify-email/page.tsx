// Verify email — handled on the IAM service.
"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Activity } from "lucide-react";
import { Suspense } from "react";

function VerifyRedirect() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    const iamUrl = process.env.NEXT_PUBLIC_IAM_URL ?? "http://localhost:5000";
    const dest = token
      ? `${iamUrl}/verify-email?token=${token}`
      : `${iamUrl}/verify-email`;
    window.location.href = dest;
  }, [token]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Activity className="h-5 w-5" />
      </div>
      <p className="text-sm text-muted-foreground">Redirecting…</p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <VerifyRedirect />
    </Suspense>
  );
}
