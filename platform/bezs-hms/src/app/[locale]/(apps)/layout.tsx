import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getServerSession } from "@/modules/server/auth/get-session";
import LayoutBreadCrumb from "@/modules/client/shared/components/LayoutBreadCrumb";
import AppNavbar from "@/modules/client/shared/components/navbar/AppNavbar";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { MenuBar } from "@/modules/client/shared/components/menubar/MenuBar";

export const dynamic = "force-dynamic";

const AppsLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return;
  }

  const user = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    username: session.user.username,
    activeOrganizationId: session.session.activeOrganizationId,
  };

  const apps = (session.session as any).apps ?? [];

  return (
    <SidebarProvider>
      <MenuBar {...user} />
      {/* h-dvh overflow-hidden clamps SidebarInset to the viewport so the page
          body can never scroll. main is the actual scroll container for regular
          pages; the flex-col chain ensures it fills the remaining height. */}
      <SidebarInset className="min-w-0 h-dvh overflow-hidden">
        <AppNavbar user={user} apps={apps} />
        <main className="flex-1 min-h-0 overflow-y-auto mx-auto px-4 py-4 pb-6 max-w-[110rem] space-y-6 w-full">
          <LayoutBreadCrumb />
          <div className="w-full">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AppsLayout;
