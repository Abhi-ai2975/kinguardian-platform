import { ApiKeyModalProvider } from "@/modules/client/admin/provider/ApiKeyModalProvider";

export default function ApiKeysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <ApiKeyModalProvider />
    </>
  );
}
