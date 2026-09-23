import { ResourceModalProvider } from "@/modules/client/admin/provider/ResourceModalProvider";

async function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ResourceModalProvider />
    </>
  );
}

export default ResourcesLayout;
