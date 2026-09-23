"use client";

import { EmptyState } from "@/modules/client/shared/components/EmptyState";
import { AlertTriangle, Layers, Plus } from "lucide-react";
import DataTable from "@/modules/client/shared/components/table/data-table";
import { IOAuthClientsTableProps } from "../../types/oauthclient.type";
import { useAdminStore } from "../../stores/admin.store";
import { oauthClientsTableColumn } from "./OAuthClientsTableColumn";

function OAuthClientsTable({ oauthClients, error }: IOAuthClientsTableProps) {
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

  if (!oauthClients || oauthClients?.length === 0) {
    return (
      <EmptyState
        icon={<Layers />}
        title="No OAuth Client Configured"
        description="Configure OAuth Clients."
        buttonLabel="Add OAuth Client"
        buttonIcon={<Plus />}
        buttonOnClick={() => {
          openModal({
            type: "createOAuthClient",
          });
        }}
      />
    );
  }

  return (
    <DataTable
      columns={oauthClientsTableColumn()}
      data={oauthClients ?? []}
      dataSize={oauthClients?.length ?? 0}
      label="OAuth Client"
      addLabelName="Add OAuth Client"
      searchField="client_name"
      fallbackText="No OAuth Client Found"
      openModal={() => {
        openModal({
          type: "createOAuthClient",
        });
      }}
    />
  );
}

export default OAuthClientsTable;
