import { AppsModalProvider } from "@/modules/client/admin/provider/AppsModalProvider";

async function AdminMenusLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <AppsModalProvider />
    </>
  );
}

export default AdminMenusLayout;
