"use client";

import { EmptyState } from "@/modules/client/shared/components/EmptyState";
import { AlertTriangle, KeyRound, Plus } from "lucide-react";
import DataTable from "@/modules/client/shared/components/table/data-table";
import { IResourceActionsTableProps } from "../../types/resources.type";
import { useAdminStore } from "../../stores/admin.store";
import { resourceActionsTableColumn } from "./ResourceActionsTableColumn";

function ResourceActionsTable({ actions, error }: IResourceActionsTableProps) {
  const openModal = useAdminStore((state) => state.onOpen);

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

  if (!actions || actions.length === 0) {
    return (
      <EmptyState
        icon={<KeyRound />}
        title="No Resource Actions Found"
        description="Create resource actions to define permission keys for your resources."
        buttonLabel="Create Action"
        buttonIcon={<Plus />}
        buttonOnClick={() => openModal({ type: "createResourceAction" })}
      />
    );
  }

  return (
    <DataTable
      columns={resourceActionsTableColumn()}
      data={actions}
      dataSize={actions.length}
      label="Resource Action"
      addLabelName="Create Action"
      searchField="key"
      fallbackText="No Resource Actions Found"
      openModal={() => openModal({ type: "createResourceAction" })}
    />
  );
}

export default ResourceActionsTable;
