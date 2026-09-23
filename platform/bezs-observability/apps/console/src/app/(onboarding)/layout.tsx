// Onboarding layout — wraps all /onboarding/* pages.
// Requires an authenticated session but does NOT require an active org
// (that is the whole purpose of the onboarding flow).
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import { StepIndicator } from "@/components/onboarding/step-indicator";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center border-b px-6">
        <span className="text-lg font-semibold tracking-tight">Watcher24</span>
      </header>
      <main className="flex flex-1 flex-col items-center px-4 py-12">
        <div className="w-full max-w-lg space-y-10">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              Set up your workspace
            </h1>
            <p className="text-sm text-muted-foreground">
              Complete the steps below to start monitoring your application.
            </p>
          </div>
          <StepIndicator />
          {children}
        </div>
      </main>
    </div>
  );
}
