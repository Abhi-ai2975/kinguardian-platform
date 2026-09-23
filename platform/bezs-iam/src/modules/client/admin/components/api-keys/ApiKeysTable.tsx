"use client";

import { useAdminStore } from "../../stores/admin.store";
import DataTable from "@/modules/client/shared/components/table/data-table";
import { EmptyState } from "@/modules/client/shared/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Key, Plus, Trash2 } from "lucide-react";
import { apiKeysTableColumns } from "./ApiKeysTableColumn";
import { IApiKeysTableProps } from "../../types/apikeys.type";
import { deleteExpiredApiKeysAction } from "@/modules/server/presentation/actions/admin";
import { toast } from "sonner";
import { useState } from "react";

export function ApiKeysTable({
  apiKeys,
  total,
  error,
  currentUserId,
}: IApiKeysTableProps) {
  const { onOpen } = useAdminStore();
  const [cleaning, setCleaning] = useState(false);

  async function handleCleanExpired() {
    setCleaning(true);
    const [, err] = await deleteExpiredApiKeysAction({
      payload: {},
      transportOptions: { shouldRevalidate: true, url: "/admin/api-keys" },
    });
    setCleaning(false);
    if (err) {
      toast.error("Failed to delete expired keys");
      return;
    }
    toast.success("Expired API keys deleted");
  }

  if (error) {
    return (
      <EmptyState
        icon={<Key />}
        title="Failed to load API keys"
        description={error}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} key{total !== 1 ? "s" : ""} total
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCleanExpired}
            disabled={cleaning}
          >
            <Trash2 className="size-4 mr-2" />
            {cleaning ? "Cleaning…" : "Delete Expired"}
          </Button>
          <Button
            size="sm"
            onClick={() =>
              onOpen({
                type: "createApiKey",
                data: { apiKeyReferenceId: currentUserId },
              })
            }
          >
            <Plus className="size-4 mr-2" />
            New API Key
          </Button>
        </div>
      </div>

      {!apiKeys || apiKeys.length === 0 ? (
        <EmptyState
          icon={<Key />}
          title="No API keys"
          description="Create an API key to allow programmatic access."
          buttonLabel="New API Key"
          buttonIcon={<Plus />}
          buttonOnClick={() =>
            onOpen({
              type: "createApiKey",
              data: { apiKeyReferenceId: currentUserId },
            })
          }
        />
      ) : (
        <DataTable
          columns={apiKeysTableColumns}
          data={apiKeys}
          isAddButton={false}
        />
      )}
    </div>
  );
}
