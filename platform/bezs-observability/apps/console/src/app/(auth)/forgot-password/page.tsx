// Forgot password — password reset is handled on the IAM service.
"use client";

import { useEffect } from "react";
import { Activity } from "lucide-react";

export default function ForgotPasswordPage() {
  useEffect(() => {
    const iamUrl = process.env.NEXT_PUBLIC_IAM_URL ?? "http://localhost:5000";
    window.location.href = `${iamUrl}/forgot-password`;
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Activity className="h-5 w-5" />
      </div>
      <p className="text-sm text-muted-foreground">Redirecting…</p>
    </div>
  );
}
