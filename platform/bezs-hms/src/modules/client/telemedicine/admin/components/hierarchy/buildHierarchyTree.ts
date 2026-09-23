/**
 * buildHierarchyTree — pure utility that turns a flat, parent-referencing
 * list into React Flow nodes + edges laid out as a top-down tree.
 *
 * Layer: client / telemedicine / admin / components / hierarchy
 *
 * There is no server-side tree/children endpoint for Organization or
 * Location in fhir-gql — both resources only carry a single parent
 * reference (`partof_id` / `part_of_id`). This utility builds the tree
 * client-side from a flat array using a leaf-counting recursive layout:
 * each node's horizontal position is the average of its children's
 * positions, and leaves are placed left-to-right in traversal order. This
 * is sufficient for an org/location directory (dozens of nodes, list
 * endpoints cap at 200) — no layout library (dagre/elkjs) is needed.
 *
 * Id handling: Organization's `partof_id` is a number while Location's
 * `part_of_id` is a string (confirmed against fhir-gql's Pydantic models) —
 * every id is coerced to a string here via `getId`/`getParentId` so the two
 * resources can share this same utility safely.
 */

import type { Edge, Node } from "@xyflow/react";

const ROW_HEIGHT = 150;
const COL_WIDTH = 240;

/** Data attached to every generated node — the original item, for renderNode. */
export interface HierarchyItemData<T> extends Record<string, unknown> {
  item: T;
}

export interface BuiltHierarchy<T> {
  nodes: Node<HierarchyItemData<T>>[];
  edges: Edge[];
}

/**
 * Builds a top-down tree layout from a flat list of parent-referencing items.
 *
 * @param items - Flat list of records (already scoped to the current tenant).
 * @param getId - Extracts a stable string id from an item.
 * @param getParentId - Extracts the parent's string id, or null/undefined for a root.
 * @returns React Flow `nodes` (positioned) and `edges` (parent → child).
 */
export function buildHierarchyTree<T>(
  items: T[],
  getId: (item: T) => string,
  getParentId: (item: T) => string | null | undefined,
): BuiltHierarchy<T> {
  const itemIds = new Set(items.map(getId));
  const childrenByParentId = new Map<string, T[]>();
  const ROOT_KEY = "__root__";

  for (const item of items) {
    const rawParentId = getParentId(item);
    // Treat a missing id, a null/undefined parent, or a parent that isn't in
    // the current fetched set (filtered out, deleted, or paginated away) as
    // a root — never silently drop the node.
    const parentId =
      rawParentId != null && itemIds.has(rawParentId) ? rawParentId : ROOT_KEY;
    if (!childrenByParentId.has(parentId)) childrenByParentId.set(parentId, []);
    childrenByParentId.get(parentId)!.push(item);
  }

  const nodes: Node<HierarchyItemData<T>>[] = [];
  const edges: Edge[] = [];
  let cursorX = 0;

  /**
   * Recursively places `item` and its subtree, returning the horizontal
   * column its node was centered on so the parent can center itself over
   * its children.
   */
  function place(item: T, depth: number, ancestry: Set<string>): number {
    const id = getId(item);

    if (ancestry.has(id)) {
      // Cycle guard — should never happen with well-formed data, but a bad
      // manual partof/part_of edit could create one. Stop descending rather
      // than recursing forever; don't create a duplicate node for `id`
      // since it already exists higher up in this same path.
      // eslint-disable-next-line no-console
      console.warn(
        `buildHierarchyTree: cycle detected at node "${id}" — stopping descent.`,
      );
      return cursorX;
    }

    const nextAncestry = new Set(ancestry);
    nextAncestry.add(id);

    const children = childrenByParentId.get(id) ?? [];

    let centerX: number;
    if (children.length === 0) {
      centerX = cursorX;
      cursorX += 1;
    } else {
      const childCenters = children.map((child) => {
        edges.push({
          id: `e-${id}-${getId(child)}`,
          source: id,
          target: getId(child),
          type: "smoothstep",
        });
        return place(child, depth + 1, nextAncestry);
      });
      centerX = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
    }

    nodes.push({
      id,
      type: "hierarchyNode",
      position: { x: centerX * COL_WIDTH, y: depth * ROW_HEIGHT },
      data: { item },
    });

    return centerX;
  }

  const roots = childrenByParentId.get(ROOT_KEY) ?? [];
  for (const root of roots) {
    place(root, 0, new Set());
  }

  return { nodes, edges };
}
