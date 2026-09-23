/**
 * HierarchyGraph — generic React Flow tree view shared by the Organization
 * and Location hierarchy screens.
 *
 * Layer: client / telemedicine / admin / components / hierarchy
 *
 * Reuses the existing `Canvas` wrapper (`src/components/ai-elements/canvas.tsx`)
 * around `<ReactFlow>`. Canvas's own defaults set `panOnDrag={false}` +
 * `selectionOnDrag={true}` — correct for the AI workflow canvas (where
 * click-drag draws a selection box and panning is scroll-only), but it made
 * this read-only tree feel stuck since click-and-drag is the interaction
 * most people reach for first. Overridden below: `panOnDrag` re-enabled,
 * `selectionOnDrag` disabled (no multi-select use case here). Props passed
 * to `<Canvas>` win over its internal defaults since it spreads `{...props}`
 * after them. Node positions and edges are computed once via
 * `buildHierarchyTree` and memoized on the input list.
 */

"use client";

import { useMemo, type ReactNode } from "react";
import type { NodeMouseHandler } from "@xyflow/react";
import { Canvas } from "@/components/ai-elements/canvas";
import { buildHierarchyTree } from "./buildHierarchyTree";
import { HierarchyNode, type HierarchyNodeRenderData } from "./HierarchyNode";

const NODE_TYPES = { hierarchyNode: HierarchyNode };

export interface HierarchyGraphProps<T> {
  /** Flat, tenant-scoped list of records to render as a tree. */
  items: T[];
  /** Extracts a stable string id from an item. */
  getId: (item: T) => string;
  /** Extracts the parent's string id, or null/undefined for a root. */
  getParentId: (item: T) => string | null | undefined;
  /** Renders the card content for one item — name, badges, etc. */
  renderNode: (item: T) => ReactNode;
  /** Optional click handler — e.g. open the item's edit modal. */
  onNodeClick?: (item: T) => void;
  /** Message shown when `items` is empty. */
  emptyMessage?: string;
  /** Tailwind height class for the graph container — React Flow needs an explicit height. */
  heightClassName?: string;
}

/** Generic read-only tree visualization for any self-referential resource list. */
export function HierarchyGraph<T>({
  items,
  getId,
  getParentId,
  renderNode,
  onNodeClick,
  emptyMessage = "No records to display.",
  heightClassName = "h-[70vh]",
}: HierarchyGraphProps<T>) {
  const { nodes, edges } = useMemo(
    () => buildHierarchyTree(items, getId, getParentId),
    [items, getId, getParentId],
  );

  const renderedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: { content: renderNode(node.data.item) } satisfies HierarchyNodeRenderData,
      })),
    [nodes, renderNode],
  );

  const handleNodeClick: NodeMouseHandler | undefined = onNodeClick
    ? (_event, node) => {
        const original = nodes.find((n) => n.id === node.id)?.data.item;
        if (original) onNodeClick(original);
      }
    : undefined;

  if (items.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-md border border-dashed ${heightClassName}`}
      >
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`w-full rounded-md border ${heightClassName}`}>
      <Canvas
        nodes={renderedNodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodeClick={handleNodeClick}
        panOnDrag
        selectionOnDrag={false}
      />
    </div>
  );
}
