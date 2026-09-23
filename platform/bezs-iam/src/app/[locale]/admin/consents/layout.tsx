import { ConsentModalProvider } from "@/modules/client/admin/provider/ConsentModalProvider";

async function AdminConsentsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <ConsentModalProvider />
    </>
  );
}

export default AdminConsentsLayout;
