// Dashboard layout — wraps all /overview, /audit, /logs, etc. pages.
// Session is read server-side once here so inner pages don't re-fetch.
// Also reads the watcher_app cookie to propagate the active app filter.
// SidebarProvider wraps the layout so AppSidebar and Header can share
// sidebar state (open/collapsed) via context.
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getServerSession } from "@/lib/auth-server";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { SidebarProvider } from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  // New users without an active organisation go through the onboarding wizard.
  if (!session.session.activeOrganizationId) {
    redirect("/onboarding/create-org");
  }

  const orgId = session.session.activeOrganizationId;
  const jar = await cookies();
  const activeAppId = jar.get("watcher_app")?.value ?? null;

  // Read the persisted sidebar state from cookie so it survives page loads.
  const sidebarOpen = jar.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <div className="flex h-svh w-full overflow-hidden bg-background">
        <AppSidebar userRole={session.user.role} />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Header user={session.user} orgId={orgId} activeAppId={activeAppId} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
