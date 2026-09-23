import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireRole } from "@/modules/server/shared/auth/require-role";
import { MenuBar } from "@/modules/client/shared/menubar/MenuBar";
import AppNavbar from "@/modules/client/shared/navbar/AppNavbar";

async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireRole(["superadmin"]);

  return (
    <SidebarProvider>
      <MenuBar />
      <SidebarInset className="min-w-0">
        <AppNavbar />
        <main className="mx-auto px-8 py-4 pb-6 container space-y-6 w-full">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default AdminLayout;
