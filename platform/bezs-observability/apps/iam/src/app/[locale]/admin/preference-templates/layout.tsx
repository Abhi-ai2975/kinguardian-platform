import { PreferenceTemplatesModalProvider } from "@/modules/client/admin/provider/PreferenceTemplatesModalProvider";

async function PreferenceTemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <PreferenceTemplatesModalProvider />
    </>
  );
}

export default PreferenceTemplatesLayout;
