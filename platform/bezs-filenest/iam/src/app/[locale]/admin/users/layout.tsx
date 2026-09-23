import { UserModalProvider } from "@/modules/client/admin/provider/UserModalProvider";

async function AdminUsersLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <UserModalProvider />
    </>
  );
}

export default AdminUsersLayout;
