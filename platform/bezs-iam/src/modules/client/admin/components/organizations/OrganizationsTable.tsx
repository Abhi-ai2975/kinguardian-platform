"use client";

import { Building2, AlertCircle } from "lucide-react";
import DataTable from "@/modules/client/shared/components/table/data-table";
import { organizationsTableColumn } from "./OrganizationsTableColumn";
import { IOrganizationsTableProps } from "../../types/organizations.type";
import { EmptyState } from "@/modules/client/shared/components/EmptyState";
import { useAdminStore } from "../../stores/admin.store";

function OrganizationsTable({ organizations, error }: IOrganizationsTableProps) {
  const openModal = useAdminStore((state) => state.onOpen);

  if (error) {
    return (
      <EmptyState
        icon={<AlertCircle />}
        title="An Unexpected Error Occurred!"
        description={error.message || "Please try again later."}
        error={error}
      />
    );
  }

  if (!organizations || organizations.length === 0) {
    return (
      <EmptyState
        icon={<Building2 />}
        title="No Organizations Found"
        description="Create an organization to get started."
        buttonLabel="New Organization"
        buttonOnClick={() => openModal({ type: "createOrganization" })}
      />
    );
  }

  return (
    <DataTable
      columns={organizationsTableColumn()}
      data={organizations}
      dataSize={organizations.length}
      label="Organization"
      isAddButton
      addLabelName="New Organization"
      openModal={() => openModal({ type: "createOrganization" })}
      searchField="name"
      fallbackText="No Organizations Found"
    />
  );
}

export default OrganizationsTable;
