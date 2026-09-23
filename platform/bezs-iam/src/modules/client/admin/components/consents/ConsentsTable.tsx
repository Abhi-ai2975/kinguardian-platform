"use client";

import { EmptyState } from "@/modules/client/shared/components/EmptyState";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import DataTable from "@/modules/client/shared/components/table/data-table";
import { IConsentsTableProps } from "../../types/consents.type";
import { consentsTableColumn } from "./ConsentsTableColumn";

function ConsentsTable({ consents, error }: IConsentsTableProps) {
  if (error) {
    return (
      <EmptyState
        icon={<AlertTriangle className="text-destructive" />}
        title="An Unexpected Error Occurred!"
        description={error.message || "Please try again later."}
        buttonLabel="Reload"
        error={error}
      />
    );
  }

  if (!consents || consents.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheck />}
        title="No Consents Found"
        description="No users have granted OAuth consent yet."
      />
    );
  }

  return (
    <DataTable
      columns={consentsTableColumn()}
      data={consents}
      dataSize={consents.length}
      label="Consent"
      searchField="clientId"
      fallbackText="No Consents Found"
      isAddButton={false}
    />
  );
}

export default ConsentsTable;
