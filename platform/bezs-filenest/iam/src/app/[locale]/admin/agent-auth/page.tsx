import { requireRole } from "@/modules/server/shared/auth/require-role";
import {
  listAgentsAction,
  listHostsAction,
  listPendingApprovalsAction,
} from "@/modules/server/presentation/actions/admin";
import AgentsTable from "@/modules/client/admin/components/agent-auth/AgentsTable";
import HostsTable from "@/modules/client/admin/components/agent-auth/HostsTable";
import ApprovalsTable from "@/modules/client/admin/components/agent-auth/ApprovalsTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Server, ShieldCheck } from "lucide-react";

async function AgentAuthPage() {
  await requireRole(["superadmin"]);

  const [agents, agentsError] = await listAgentsAction();
  const [hosts, hostsError] = await listHostsAction();
  const [approvals, approvalsError] = await listPendingApprovalsAction();

  return (
    <div className="space-y-8 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Agent Auth</h1>
        <p className="text-sm text-muted-foreground">
          Manage AI agents, host configurations, and capability approvals.
        </p>
      </div>

      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents" className="gap-2">
            <Bot className="h-4 w-4" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="hosts" className="gap-2">
            <Server className="h-4 w-4" />
            Hosts
          </TabsTrigger>
          <TabsTrigger value="approvals" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Approvals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-6">
          <AgentsTable agents={agents ?? null} error={agentsError ?? null} />
        </TabsContent>

        <TabsContent value="hosts" className="mt-6">
          <HostsTable hosts={hosts ?? null} error={hostsError ?? null} />
        </TabsContent>

        <TabsContent value="approvals" className="mt-6">
          <ApprovalsTable
            approvals={approvals ?? null}
            error={approvalsError ?? null}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AgentAuthPage;
