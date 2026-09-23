/**
 * ApiKeysTable — TanStack Table for API keys on a project.
 *
 * Receives initialData (including total count) from the RSC page.
 * Refetches when the store trigger increments (after create / revoke).
 *
 * @module
 */
"use client";

import * as React from "react";
import { useServerAction } from "zsa-react";
import { KeyRound, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  DataTable,
  DataTableToolbar,
  useDataTable,
} from "@/modules/client/shared/components/tables";
import { listApiKeysAction } from "@/modules/server/presentation/actions/api-key.actions";
import { useApiKeyStore } from "../stores/api-key.store";
import { apiKeysTableColumns } from "./ApiKeysTableColumn";
import type { TApiKeyList } from "@/modules/entities/schemas/api-key";

interface ApiKeysTableProps {
  initialData: TApiKeyList;
  organizationId: string;
  projectId: string;
}

export function ApiKeysTable({ initialData, organizationId, projectId }: ApiKeysTableProps) {
  const { onOpen, trigger } = useApiKeyStore();
  const [data, setData] = React.useState<TApiKeyList>(initialData);

  const { execute } = useServerAction(listApiKeysAction);

  React.useEffect(() => {
    if (trigger === 0) return;
    execute({
      payload: {
        organizationId,
        projectId,
        sortBy: "createdAt",
        sortDirection: "desc",
      },
    }).then(([result]) => {
      if (result) setData(result);
    });
  }, [trigger, organizationId, projectId, execute]);

  const columns = React.useMemo(() => apiKeysTableColumns(), []);
  const { table } = useDataTable({
    columns,
    data: data.apiKeys,
    initialSorting: [{ id: "createdAt", desc: true }],
    initialPageSize: 20,
  });

  return (
    <DataTable
      table={table}
      emptyState={
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <KeyRound className="h-8 w-8 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No API keys yet</EmptyTitle>
            <EmptyDescription>
              Create an API key to authenticate SDK and server-to-server requests.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => onOpen("createApiKey")}>
              <Plus className="h-4 w-4 mr-1" />
              New API key
            </Button>
          </EmptyContent>
        </Empty>
      }
    >
      <DataTableToolbar table={table}>
        <Button size="sm" onClick={() => onOpen("createApiKey")}>
          <Plus className="h-4 w-4 mr-1" />
          New API key
        </Button>
      </DataTableToolbar>
    </DataTable>
  );
}
