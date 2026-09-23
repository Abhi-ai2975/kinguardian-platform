/**
 * HierarchyNode — React Flow custom node for the Organization/Location
 * hierarchy views.
 *
 * Layer: client / telemedicine / admin / components / hierarchy
 *
 * Mirrors the Card-based visual structure of `src/components/ai-elements/node.tsx`
 * but uses vertical handles (Top/Bottom) for a top-down tree instead of that
 * component's horizontal Left/Right handles (built for the AI-hub workflow
 * graph) — copied rather than imported so the shared ai-elements primitive
 * stays untouched for its existing horizontal-graph usage.
 */

"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Card, CardContent } from "@/components/ui/card";
import type { ReactNode } from "react";

/** Data shape attached to each node by HierarchyGraph before passing to React Flow. */
export interface HierarchyNodeRenderData extends Record<string, unknown> {
  content: ReactNode;
}

/** Renders one hierarchy card with top (target) and bottom (source) connection handles. */
export function HierarchyNode({ data }: NodeProps) {
  const { content } = data as HierarchyNodeRenderData;

  return (
    <Card className="w-56 gap-0 rounded-md p-0 shadow-sm">
      <Handle position={Position.Top} type="target" />
      <CardContent className="p-3">{content}</CardContent>
      <Handle position={Position.Bottom} type="source" />
    </Card>
  );
}
