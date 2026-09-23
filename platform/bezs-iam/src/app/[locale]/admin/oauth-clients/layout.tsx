import { OAuthClientModalProvider } from "@/modules/client/admin/provider/OAuthClientModalProvider";

async function AdminOAuthClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <OAuthClientModalProvider />
    </>
  );
}

export default AdminOAuthClientLayout;
