"use client";

import { AlertTriangle, Plus, Server } from "lucide-react";
import { EmptyState } from "@/modules/client/shared/components/EmptyState";
import DataTable from "@/modules/client/shared/components/table/data-table";
import { IHostsTableProps } from "../../types/agentauth.type";
import { hostsTableColumn } from "./HostsTableColumn";
import { useAdminStore } from "../../stores/admin.store";

function HostsTable({ hosts, error }: IHostsTableProps) {
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

  if (!hosts || hosts.length === 0) {
    return (
      <EmptyState
        icon={<Server />}
        title="No Hosts Found"
        description="Create a host to issue enrollment tokens and register agents under it."
        buttonLabel="Create Host"
        buttonIcon={<Plus />}
        buttonOnClick={() => openModal({ type: "createHost" })}
      />
    );
  }

  return (
    <DataTable
      columns={hostsTableColumn()}
      data={hosts}
      dataSize={hosts.length}
      label="Host"
      addLabelName="Create Host"
      searchField="name"
      fallbackText="No hosts found"
      openModal={() => openModal({ type: "createHost" })}
    />
  );
}

export default HostsTable;
