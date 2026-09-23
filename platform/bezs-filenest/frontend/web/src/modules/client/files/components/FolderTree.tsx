/**
 * FolderTree — folder navigation sidebar with create and delete controls.
 *
 * Displays a hierarchical tree built from the flat folder list returned by
 * the API (materialized-path model). Clicking a folder pushes `?folder_id=xxx`
 * to the URL so the state is shareable and back-button safe. Clicking the
 * active folder (or "All files") clears the filter.
 *
 * Each folder row has a "..." menu for creating a subfolder or deleting the folder.
 * The "+ New folder" button at the top creates a root-level folder.
 *
 * @module
 */
"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, Folder, FolderOpen, Files, Plus, MoreHorizontal, FolderPlus, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { folderStore } from "@/modules/client/files/stores/folder.store";
import type { TFolder, TFolderList } from "@/modules/entities/schemas/folder";

interface FolderNode extends TFolder {
  children: FolderNode[];
}

function buildTree(folders: TFolder[]): FolderNode[] {
  const nodeMap = new Map<string, FolderNode>();
  for (const f of folders) {
    nodeMap.set(f.id, { ...f, children: [] });
  }
  const roots: FolderNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parent_folder_id && nodeMap.has(node.parent_folder_id)) {
      nodeMap.get(node.parent_folder_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sort = (nodes: FolderNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const n of nodes) sort(n.children);
  };
  sort(roots);
  return roots;
}

interface FolderNodeItemProps {
  node: FolderNode;
  activeFolderId: string | null;
  depth: number;
  onSelect: (id: string) => void;
}

function FolderNodeItem({ node, activeFolderId, depth, onSelect }: FolderNodeItemProps) {
  const isActive = activeFolderId === node.id;
  const hasChildren = node.children.length > 0;
  const [expanded, setExpanded] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const isAncestorOfActive = React.useMemo(() => {
    if (!activeFolderId) return false;
    const isDescendant = (n: FolderNode): boolean =>
      n.id === activeFolderId || n.children.some(isDescendant);
    return node.children.some(isDescendant);
  }, [activeFolderId, node]);

  React.useEffect(() => {
    if (isAncestorOfActive) setExpanded(true);
  }, [isAncestorOfActive]);

  return (
    <li>
      <div
        className={cn(
          "group flex items-center rounded-md transition-colors",
          isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/60",
        )}
        style={{ paddingLeft: `${(depth + 1) * 12}px` }}
      >
        <button
          type="button"
          className={cn(
            "flex-1 flex items-center gap-1.5 pr-1 py-1 text-sm text-left min-w-0",
            isActive ? "text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onSelect(node.id)}
        >
          {hasChildren ? (
            <span
              className="shrink-0"
              onClick={(e) => { e.stopPropagation(); setExpanded((p) => !p); }}
            >
              <ChevronRight
                className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")}
              />
            </span>
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          {isActive
            ? <FolderOpen className="h-3.5 w-3.5 shrink-0" />
            : <Folder className="h-3.5 w-3.5 shrink-0" />
          }
          <span className="truncate">{node.name}</span>
        </button>

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "p-1 mr-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted",
                menuOpen && "opacity-100",
              )}
              onClick={(e) => e.stopPropagation()}
              aria-label="Folder options"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onClick={() => folderStore.getState().onOpen("createFolder", node)}
            >
              <FolderPlus className="mr-2 h-3.5 w-3.5" />
              New subfolder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => folderStore.getState().onOpen("deleteFolder", node)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasChildren && expanded && (
        <ul className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <FolderNodeItem
              key={child.id}
              node={child}
              activeFolderId={activeFolderId}
              depth={depth + 1}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

interface FolderTreeProps {
  folderList: TFolderList;
  activeFolderId: string | null;
  projectId: string;
}

export function FolderTree({ folderList, activeFolderId, projectId }: FolderTreeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tree = React.useMemo(() => buildTree(folderList.items), [folderList.items]);

  const navigate = React.useCallback(
    (folderId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (folderId) {
        params.set("folder_id", folderId);
      } else {
        params.delete("folder_id");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  return (
    <nav className="w-52 shrink-0">
      <div className="flex items-center justify-between px-2 mb-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Folders
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={() => folderStore.getState().onOpen("createFolder", null)}
          title="New folder"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {folderList.items.length === 0 && (
        <p className="text-xs text-muted-foreground px-2">No folders yet.</p>
      )}
      <ul className="space-y-0.5">
        {/* "All files" root entry */}
        <li>
          <button
            type="button"
            className={cn(
              "w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors text-left",
              activeFolderId === null
                ? "bg-accent text-accent-foreground font-medium"
                : "hover:bg-muted/60 text-muted-foreground hover:text-foreground",
            )}
            onClick={() => navigate(null)}
          >
            <span className="w-3.5 shrink-0" />
            <Files className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">All files</span>
          </button>
        </li>

        {tree.map((node) => (
          <FolderNodeItem
            key={node.id}
            node={node}
            activeFolderId={activeFolderId}
            depth={0}
            onSelect={(id) => navigate(id === activeFolderId ? null : id)}
          />
        ))}
      </ul>
    </nav>
  );
}
