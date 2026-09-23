// Admin layout — wraps all /admin/* pages. Validates superadmin role server-side
// and redirects non-superadmins to the dashboard before rendering anything.
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) redirect("/login");
  if (session.user.role !== "superadmin") redirect("/overview");

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader
          userName={session.user.name}
          userEmail={session.user.email}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
