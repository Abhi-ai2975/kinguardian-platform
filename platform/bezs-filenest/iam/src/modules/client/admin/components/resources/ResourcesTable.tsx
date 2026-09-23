"use client";

import { EmptyState } from "@/modules/client/shared/components/EmptyState";
import { AlertTriangle, Database, Plus } from "lucide-react";
import DataTable from "@/modules/client/shared/components/table/data-table";
import { IResourcesTableProps } from "../../types/resources.type";
import { useAdminStore } from "../../stores/admin.store";
import { resourcesTableColumn } from "./ResourcesTableColumn";

function ResourcesTable({ resources, error }: IResourcesTableProps) {
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

  if (!resources || resources.length === 0) {
    return (
      <EmptyState
        icon={<Database />}
        title="No Resources Found"
        description="Create a resource to start defining permission keys."
        buttonLabel="Create Resource"
        buttonIcon={<Plus />}
        buttonOnClick={() => openModal({ type: "createResource" })}
      />
    );
  }

  return (
    <DataTable
      columns={resourcesTableColumn()}
      data={resources}
      dataSize={resources.length}
      label="Resource"
      addLabelName="Create Resource"
      searchField="name"
      fallbackText="No Resources Found"
      openModal={() => openModal({ type: "createResource" })}
    />
  );
}

export default ResourcesTable;
