"use client";

import { EmptyState } from "@/modules/client/shared/components/EmptyState";
import { Users } from "lucide-react";
import DataTable from "@/modules/client/shared/components/table/data-table";
import { usersTableColumn } from "./UsersTableColumn";
import { IUsersTableProps } from "../../types/users.type";
import { useAdminStore } from "../../stores/admin.store";

function UsersTable({ users, error }: IUsersTableProps) {
  const openModal = useAdminStore((state) => state.onOpen);

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

  if (!users || users.length === 0) {
    return (
      <EmptyState
        icon={<Users />}
        title="No Users Found"
        description="No users have registered yet."
        buttonLabel="Add User"
        buttonOnClick={() => openModal({ type: "createUser" })}
      />
    );
  }

  return (
    <DataTable
      columns={usersTableColumn()}
      data={users}
      dataSize={users.length}
      label="User"
      addLabelName="Add User"
      searchField="email"
      filterField="role"
      filterFieldLabel="Role"
      filterValues={["guest", "admin", "superadmin"]}
      fallbackText="No Users Found"
      openModal={() => openModal({ type: "createUser" })}
    />
  );
}

export default UsersTable;
