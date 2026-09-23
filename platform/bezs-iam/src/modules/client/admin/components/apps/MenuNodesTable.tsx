"use client";

import { EmptyState } from "@/modules/client/shared/components/EmptyState";
import { AlertTriangle, Plus, LayoutList } from "lucide-react";
import DataTable from "@/modules/client/shared/components/table/data-table";
import { IMenuNodesTreeProps } from "../../types/apps.type";
import { useAdminStore } from "../../stores/admin.store";
import { menuNodesTableColumn } from "./MenuNodesTableColumn";
import { useServerAction } from "zsa-react";
import { reorderMenuNodeAction } from "@/modules/server/presentation/actions/admin";
import { useRouter } from "next/navigation";

function MenuNodesTable({ nodes, appId, appName, error }: IMenuNodesTreeProps) {
  const openModal = useAdminStore((state) => state.onOpen);
  const router = useRouter();

  const { execute: reorder } = useServerAction(reorderMenuNodeAction, {
    onSuccess() {
      router.refresh();
    },
  });

  function handleReorder(nodeId: string, direction: "up" | "down") {
    reorder({
      payload: { nodeId, direction },
      transportOptions: {
        shouldRevalidate: false,
        url: `/admin/apps/${appId}/menus`,
      },
    });
  }

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

  if (!nodes || nodes.length === 0) {
    return (
      <EmptyState
        icon={<LayoutList />}
        title="No Menu Nodes"
        description={`Add menu nodes to the ${appName} application.`}
        buttonLabel="Add Menu Node"
        buttonIcon={<Plus />}
        buttonOnClick={() =>
          openModal({ type: "createMenuNode", data: { menuNodeAppId: appId } })
        }
      />
    );
  }

  return (
    <DataTable
      columns={menuNodesTableColumn({ onReorder: handleReorder })}
      data={nodes}
      dataSize={nodes.length}
      label="Menu Node"
      addLabelName="Add Menu Node"
      searchField="label"
      fallbackText="No Menu Nodes Found"
      openModal={() =>
        openModal({ type: "createMenuNode", data: { menuNodeAppId: appId } })
      }
    />
  );
}

export default MenuNodesTable;
