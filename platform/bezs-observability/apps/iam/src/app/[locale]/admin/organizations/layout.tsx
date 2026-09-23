import { OrganizationModalProvider } from "@/modules/client/admin/provider/OrganizationModalProvider";

async function AdminOrganizationsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <OrganizationModalProvider />
    </>
  );
}

export default AdminOrganizationsLayout;
