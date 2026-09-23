import { AgentAuthModalProvider } from "@/modules/client/admin/provider/AgentAuthModalProvider";

async function AgentAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AgentAuthModalProvider />
    </>
  );
}

export default AgentAuthLayout;
