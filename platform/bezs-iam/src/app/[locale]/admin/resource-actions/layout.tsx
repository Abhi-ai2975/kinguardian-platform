import { ResourceModalProvider } from "@/modules/client/admin/provider/ResourceModalProvider";

async function ResourceActionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <ResourceModalProvider />
    </>
  );
}

export default ResourceActionsLayout;
