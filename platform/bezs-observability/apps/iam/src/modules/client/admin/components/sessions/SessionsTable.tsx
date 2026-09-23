"use client";

import { MonitorX, ShieldOff } from "lucide-react";
import DataTable from "@/modules/client/shared/components/table/data-table";
import { sessionsTableColumn } from "./SessionsTableColumn";
import { ISessionsTableProps } from "../../types/sessions.type";
import { EmptyState } from "@/modules/client/shared/components/EmptyState";
import { useAdminStore } from "../../stores/admin.store";
import { Button } from "@/components/ui/button";

function SessionsTable({ sessions, error }: ISessionsTableProps) {
  const openModal = useAdminStore((state) => state.onOpen);

  if (error) {
    return (
      <EmptyState
        icon={<MonitorX />}
        title="An Unexpected Error Occurred!"
        description={error.message || "Please try again later."}
        error={error}
      />
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <EmptyState
        icon={<MonitorX />}
        title="No Sessions Found"
        description="There are no active sessions at the moment."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => openModal({ type: "revokeAllSessions" })}
        >
          <ShieldOff className="mr-2 h-4 w-4" />
          Revoke All Sessions
        </Button>
      </div>
      <DataTable
        columns={sessionsTableColumn()}
        data={sessions}
        dataSize={sessions.length}
        label="Session"
        isAddButton={false}
        searchField="ipAddress"
        fallbackText="No Sessions Found"
      />
    </div>
  );
}

export default SessionsTable;
