/**
 * FileUploadList — scrollable list of all queued/active/done upload items.
 *
 * Renders one FileUploadItem per upload. Passes the remove callback down
 * so items can dequeue themselves while still queued or errored.
 *
 * @module
 */
"use client";

import { FileUploadItem } from "./FileUploadItem";
import type { UploadItem } from "@/modules/client/files/hooks/useFileUpload";

interface FileUploadListProps {
  items: UploadItem[];
  onRemove: (id: string) => void;
}

export function FileUploadList({ items, onRemove }: FileUploadListProps) {
  if (items.length === 0) return null;

  const done = items.filter((i) => i.status === "done").length;
  const error = items.filter((i) => i.status === "error").length;

  return (
    <div className="space-y-2">
      {/* Summary badge row */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          {items.length} file{items.length !== 1 ? "s" : ""} queued
        </p>
        {(done > 0 || error > 0) && (
          <p className="text-xs text-muted-foreground">
            {done > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400">
                {done} done
              </span>
            )}
            {done > 0 && error > 0 && " · "}
            {error > 0 && (
              <span className="text-destructive">{error} failed</span>
            )}
          </p>
        )}
      </div>

      {/* Item list — fixed height + scroll for many files */}
      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
        {items.map((item) => (
          <FileUploadItem key={item.id} item={item} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}
