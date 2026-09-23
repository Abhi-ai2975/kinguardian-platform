import { AppsModalProvider } from "@/modules/client/admin/provider/AppsModalProvider";

async function AdminAppsLayout({
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

export default AdminAppsLayout;
