import { SessionModalProvider } from "@/modules/client/admin/provider/SessionModalProvider";

async function AdminSessionsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <SessionModalProvider />
    </>
  );
}

export default AdminSessionsLayout;
