/**
 * WebhooksTable — webhook list table with create / delete row actions.
 *
 * Initial data is SSR-fetched by the RSC page and seeded into
 * useServerActionQuery. Post-mutation refresh is driven by
 * queryClient.invalidateQueries when the webhook store trigger increments.
 *
 * @module
 */
"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Webhook, Trash2 } from "lucide-react";
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
  DataTableWithViews,
  DataTableToolbar,
  DataTableGlobalSearch,
  DataTableSelectionBar,
  useDataTable,
} from "@/modules/client/shared/components/tables";
import { useServerActionQuery } from "@/lib/hooks/server-action-hooks";
import { listWebhooksAction } from "@/modules/server/presentation/actions/webhook.actions";
import { useWebhookStore } from "@/modules/client/webhooks/stores/webhook.store";
import { webhookKeys } from "@/modules/client/webhooks/queries/webhook.queries";
import { webhooksTableColumns } from "./WebhooksTableColumn";
import type { TWebhookList } from "@/modules/entities/schemas/webhook";

interface WebhooksTableProps {
  projectId: string;
  /** SSR-fetched first page — seeds the query to avoid a loading flash. */
  initialData: TWebhookList;
}

export function WebhooksTable({ projectId, initialData }: WebhooksTableProps) {
  const { onOpen, trigger } = useWebhookStore();
  const queryClient = useQueryClient();

  const columns = React.useMemo(() => webhooksTableColumns(), []);

  const { data, isFetching } = useServerActionQuery(listWebhooksAction, {
    input: { payload: { projectId } },
    queryKey: webhookKeys.list(projectId),
    initialData,
    staleTime: 30_000,
    placeholderData: (prev: TWebhookList | undefined) => prev,
  });

  const rows = data?.items ?? [];

  const { table } = useDataTable({
    columns,
    data: rows,
    initialSorting: [{ id: "created_at", desc: true }],
    initialPageSize: 50,
  });

  React.useEffect(() => {
    if (trigger > 0) {
      void queryClient.invalidateQueries({ queryKey: webhookKeys.lists(projectId) });
    }
  }, [trigger, projectId, queryClient]);

  const selectedRows = table.getFilteredSelectedRowModel().rows;

  const emptyState = (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <Webhook className="h-8 w-8 text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle>No webhooks yet</EmptyTitle>
        <EmptyDescription>
          Add an endpoint to start receiving signed event payloads.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm" onClick={() => onOpen("createWebhook")}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add webhook
        </Button>
      </EmptyContent>
    </Empty>
  );

  const toolbar = (
    <DataTableToolbar table={table}>
      <DataTableGlobalSearch table={table} placeholder="Search endpoints…" />
      <Button size="default" onClick={() => onOpen("createWebhook")}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add webhook
      </Button>
    </DataTableToolbar>
  );

  return (
    <>
      <DataTableWithViews
        table={table}
        toolbar={toolbar}
        defaultView="table"
        loading={isFetching}
        emptyState={emptyState}
      />

      <DataTableSelectionBar table={table} filename="webhooks">
        {selectedRows.length === 1 && (
          <Button
            variant="destructive"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => onOpen("deleteWebhook", selectedRows[0].original)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        )}
      </DataTableSelectionBar>
    </>
  );
}
