/**
 * Onboarding layout — wraps all /onboarding/* pages.
 *
 * Requires an authenticated session but does NOT require an active org —
 * that is exactly what onboarding is for. If the session has an org already
 * set (returning user who completed onboarding), redirect to dashboard.
 *
 * @module
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import Link from "next/link";
import { HardDrive } from "lucide-react";
import { getServerSession } from "@/modules/server/auth/get-session";
import { StepIndicator } from "@/components/onboarding/step-indicator";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  // Already onboarded — skip wizard.
  if (session.session?.activeOrganizationId) {
    redirect({ href: "/dashboard", locale });
    return null;
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HardDrive className="h-4 w-4" />
          </div>
          <span className="font-bold text-lg">FileNest</span>
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center px-4 py-12">
        <div className="w-full max-w-lg space-y-10">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              Set up your workspace
            </h1>
            <p className="text-sm text-muted-foreground">
              Complete the steps below to start using FileNest.
            </p>
          </div>
          <StepIndicator />
          {children}
        </div>
      </main>
    </div>
  );
}
