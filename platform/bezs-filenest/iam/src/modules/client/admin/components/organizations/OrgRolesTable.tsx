"use client";

import { EmptyState } from "@/modules/client/shared/components/EmptyState";
import { AlertTriangle, Plus, Shield } from "lucide-react";
import DataTable from "@/modules/client/shared/components/table/data-table";
import { IOrgRolesTableProps } from "../../types/organizations.type";
import { useAdminStore } from "../../stores/admin.store";
import { orgRolesTableColumn } from "./OrgRolesTableColumn";

function OrgRolesTable({ roles, organizationId, error }: IOrgRolesTableProps) {
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

  if (!roles || roles.length === 0) {
    return (
      <EmptyState
        icon={<Shield />}
        title="No Roles Found"
        description="Create custom roles to assign permissions to organization members."
        buttonLabel="Create Role"
        buttonIcon={<Plus />}
        buttonOnClick={() =>
          openModal({ type: "createOrgRole", data: { orgRoleOrganizationId: organizationId } })
        }
      />
    );
  }

  return (
    <DataTable
      columns={orgRolesTableColumn(organizationId)}
      data={roles}
      dataSize={roles.length}
      label="Role"
      addLabelName="Create Role"
      searchField="role"
      fallbackText="No Roles Found"
      openModal={() =>
        openModal({ type: "createOrgRole", data: { orgRoleOrganizationId: organizationId } })
      }
    />
  );
}

export default OrgRolesTable;
