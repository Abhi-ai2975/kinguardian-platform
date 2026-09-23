"use client";

import { AlertTriangle, Bell } from "lucide-react";
import { EmptyState } from "@/modules/client/shared/components/EmptyState";
import DataTable from "@/modules/client/shared/components/table/data-table";
import { IApprovalsTableProps } from "../../types/agentauth.type";
import { approvalsTableColumn } from "./ApprovalsTableColumn";

function ApprovalsTable({ approvals, error }: IApprovalsTableProps) {
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

  if (!approvals || approvals.length === 0) {
    return (
      <EmptyState
        icon={<Bell />}
        title="No Pending Approvals"
        description="There are no pending capability approval requests. When an agent requests capabilities via CIBA or device flow, they will appear here."
      />
    );
  }

  return (
    <DataTable
      columns={approvalsTableColumn()}
      data={approvals}
      dataSize={approvals.length}
      label="Approval"
      fallbackText="No pending approvals"
    />
  );
}

export default ApprovalsTable;
