"use client";

import { AlertTriangle, Bot, Trash2 } from "lucide-react";
import { EmptyState } from "@/modules/client/shared/components/EmptyState";
import DataTable from "@/modules/client/shared/components/table/data-table";
import { IAgentsTableProps } from "../../types/agentauth.type";
import { agentsTableColumn } from "./AgentsTableColumn";
import { Button } from "@/components/ui/button";
import { useServerAction } from "zsa-react";
import { cleanupAgentsAction } from "@/modules/server/presentation/actions/admin";
import { toast } from "sonner";

function AgentsTable({ agents, error }: IAgentsTableProps) {
  const { execute: cleanup, isPending: isCleaningUp } = useServerAction(
    cleanupAgentsAction,
    {
      onSuccess({ data }) {
        toast.success(
          `Cleanup done — ${data?.expired ?? 0} agents and ${data?.approvals_expired ?? 0} approvals removed.`,
        );
      },
      onError() {
        toast.error("Cleanup failed.");
      },
    },
  );

  if (error) {
    return (
      <EmptyState
        icon={<AlertTriangle className="text-destructive" />}
        title="An Unexpected Error Occurred!"
        description={error.message || "Please try again later."}
        error={error}
      />
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              cleanup({
                transportOptions: {
                  shouldRevalidate: true,
                  url: "/admin/agent-auth",
                },
              })
            }
            disabled={isCleaningUp}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Cleanup Expired
          </Button>
        </div>
        <EmptyState
          icon={<Bot />}
          title="No Agents Found"
          description="No AI agents registered yet. Agents self-register by posting to /agent/register with a host JWT."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            cleanup({
              transportOptions: {
                shouldRevalidate: true,
                url: "/admin/agent-auth",
              },
            })
          }
          disabled={isCleaningUp}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Cleanup Expired
        </Button>
      </div>
      <DataTable
        columns={agentsTableColumn()}
        data={agents}
        dataSize={agents.length}
        label="Agent"
        searchField="name"
        fallbackText="No agents found"
      />
    </div>
  );
}

export default AgentsTable;
