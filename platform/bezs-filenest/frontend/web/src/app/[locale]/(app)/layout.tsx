/**
 * App layout — shared shell for all authenticated product routes.
 *
 * Validates session server-side, redirects unauthenticated users to /login
 * and users without an active org to the onboarding wizard. Wraps children
 * with the collapsible AppSidebar and fixed Header.
 *
 * @module
 */
import { cookies } from "next/headers";
import { getServerSession } from "@/modules/server/auth/get-session";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { AppSidebar } from "@/modules/client/shared/components/layout/AppSidebar";
import { Header } from "@/modules/client/shared/components/layout/Header";
import { SidebarProvider } from "@/components/ui/sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({
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

  if (!session.session?.activeOrganizationId) {
    const prefill = encodeURIComponent(session.user.name ?? "");
    redirect({ href: `/onboarding/create-org?name=${prefill}`, locale });
    return null;
  }

  const jar = await cookies();
  const sidebarOpen = jar.get("sidebar_state")?.value !== "false";
  const orgId = session.session.activeOrganizationId;

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <div className="flex h-svh w-full overflow-hidden bg-background">
        <AppSidebar
          user={{
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
          }}
          userRole={session.user.role}
        />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Header user={session.user} orgId={orgId} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
