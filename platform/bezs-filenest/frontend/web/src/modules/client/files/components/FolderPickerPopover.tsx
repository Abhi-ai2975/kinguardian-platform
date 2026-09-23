/**
 * FolderPickerPopover — hierarchical folder selector rendered inside a Popover.
 *
 * Shows a tree of folders (same structure as FolderTree sidebar). Clicking a
 * folder selects it and closes the popover. Clicking the already-selected folder
 * or "Root (no folder)" clears the selection.
 *
 * @module
 */
"use client";

import * as React from "react";
import { ChevronRight, Folder, FolderOpen, FolderRoot, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TFolder, TFolderList } from "@/modules/entities/schemas/folder";

interface FolderNode extends TFolder {
  children: FolderNode[];
}

function buildTree(folders: TFolder[]): FolderNode[] {
  const nodeMap = new Map<string, FolderNode>();
  for (const f of folders) nodeMap.set(f.id, { ...f, children: [] });
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
  selectedId: string | null;
  depth: number;
  onSelect: (id: string) => void;
}

function FolderNodeItem({ node, selectedId, depth, onSelect }: FolderNodeItemProps) {
  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;
  const [expanded, setExpanded] = React.useState(false);

  const isAncestorOfSelected = React.useMemo(() => {
    if (!selectedId) return false;
    const check = (n: FolderNode): boolean =>
      n.id === selectedId || n.children.some(check);
    return node.children.some(check);
  }, [selectedId, node]);

  React.useEffect(() => {
    if (isAncestorOfSelected) setExpanded(true);
  }, [isAncestorOfSelected]);

  return (
    <li>
      <button
        type="button"
        className={cn(
          "w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
          isSelected
            ? "bg-primary text-primary-foreground"
            : "hover:bg-muted/60 text-foreground",
        )}
        style={{ paddingLeft: `${(depth + 1) * 14}px` }}
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
        {isSelected
          ? <FolderOpen className="h-3.5 w-3.5 shrink-0" />
          : <Folder className="h-3.5 w-3.5 shrink-0" />
        }
        <span className="truncate">{node.name}</span>
      </button>
      {hasChildren && expanded && (
        <ul className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <FolderNodeItem
              key={child.id}
              node={child}
              selectedId={selectedId}
              depth={depth + 1}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

interface FolderPickerPopoverProps {
  folders: TFolderList;
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function FolderPickerPopover({
  folders,
  value,
  onChange,
  disabled,
  placeholder = "Root (no folder)",
}: FolderPickerPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const tree = React.useMemo(() => buildTree(folders.items), [folders.items]);

  const selectedFolder = React.useMemo(
    () => folders.items.find((f) => f.id === value) ?? null,
    [folders.items, value],
  );

  const handleSelect = (id: string) => {
    onChange(id === value ? null : id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between font-normal h-9 text-sm"
        >
          <span className="flex items-center gap-2 truncate">
            <FolderRoot className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className={cn("truncate", !selectedFolder && "text-muted-foreground")}>
              {selectedFolder ? selectedFolder.path : placeholder}
            </span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <ul className="space-y-0.5 max-h-60 overflow-y-auto">
          <li>
            <button
              type="button"
              className={cn(
                "w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
                !value
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted/60 text-muted-foreground hover:text-foreground",
              )}
              onClick={() => { onChange(null); setOpen(false); }}
            >
              <span className="w-3.5 shrink-0" />
              <FolderRoot className="h-3.5 w-3.5 shrink-0" />
              <span>Root (no folder)</span>
            </button>
          </li>
          {tree.map((node) => (
            <FolderNodeItem
              key={node.id}
              node={node}
              selectedId={value}
              depth={0}
              onSelect={handleSelect}
            />
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
