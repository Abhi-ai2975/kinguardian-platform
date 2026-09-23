import { UserContextModalProvider } from "@/modules/client/admin/provider/UserContextModalProvider";

async function AdminUserContextLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <UserContextModalProvider />
    </>
  );
}

export default AdminUserContextLayout;
