import { OrganizationModalProvider } from "@/modules/client/admin/provider/OrganizationModalProvider";

export default function OrgRolesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <OrganizationModalProvider />
    </>
  );
}
