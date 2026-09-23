"use client";

import { EmptyState } from "@/modules/client/shared/components/EmptyState";
import { AlertTriangle, AppWindow, Plus } from "lucide-react";
import DataTable from "@/modules/client/shared/components/table/data-table";
import { IAppsTableProps } from "../../types/apps.type";
import { useAdminStore } from "../../stores/admin.store";
import { appsTableColumn } from "./AppsTableColumn";

function AppsTable({ apps, error }: IAppsTableProps) {
  const openModal = useAdminStore((state) => state.onOpen);

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

  if (!apps || apps.length === 0) {
    return (
      <EmptyState
        icon={<AppWindow />}
        title="No Apps Configured"
        description="Create an app to start building navigation menus."
        buttonLabel="Create App"
        buttonIcon={<Plus />}
        buttonOnClick={() => openModal({ type: "createApp" })}
      />
    );
  }

  return (
    <DataTable
      columns={appsTableColumn()}
      data={apps}
      dataSize={apps.length}
      label="App"
      addLabelName="Create App"
      searchField="name"
      fallbackText="No Apps Found"
      openModal={() => openModal({ type: "createApp" })}
    />
  );
}

export default AppsTable;
