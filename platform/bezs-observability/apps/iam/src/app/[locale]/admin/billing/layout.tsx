import { BillingModalProvider } from "@/modules/client/admin/provider/BillingModalProvider";

async function AdminBillingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <BillingModalProvider />
    </>
  );
}

export default AdminBillingLayout;
