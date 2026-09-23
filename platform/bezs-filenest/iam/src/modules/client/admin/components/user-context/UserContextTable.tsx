"use client";

import { Users } from "lucide-react";
import { EmptyState } from "@/modules/client/shared/components/EmptyState";
import DataTable from "@/modules/client/shared/components/table/data-table";
import { userContextTableColumn } from "./UserContextTableColumn";
import { IUserContextTableProps } from "../../types/user-context.type";

function UserContextTable({ items, error }: IUserContextTableProps) {
  if (error) {
    return (
      <EmptyState
        icon={<Users />}
        title="An Unexpected Error Occurred!"
        description={error.message || "Please try again later."}
        error={error}
      />
    );
  }

  if (!items || items.length === 0) {
    return (
      <EmptyState
        icon={<Users />}
        title="No Users Found"
        description="No users exist in the system."
      />
    );
  }

  return (
    <DataTable
      columns={userContextTableColumn()}
      data={items}
      dataSize={items.length}
      label="User"
      searchField="userName"
      fallbackText="No Users Found"
      isAddButton={false}
    />
  );
}

export default UserContextTable;
