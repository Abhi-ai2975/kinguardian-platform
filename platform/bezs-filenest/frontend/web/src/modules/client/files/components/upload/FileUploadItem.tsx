/**
 * FileUploadItem — single file row in the upload queue.
 *
 * Shows filename, size, upload strategy (single / multipart), a progress bar,
 * a status icon, and a remove button for queued or errored items.
 *
 * Progress -1 means indeterminate (server-side mode — no XHR progress).
 *
 * @module
 */
"use client";

import { X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { UploadItem } from "@/modules/client/files/hooks/useFileUpload";

interface FileUploadItemProps {
  item: UploadItem;
  onRemove: (id: string) => void;
}

function FileTypeLabel({ isMultipart }: { isMultipart: boolean }) {
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
      {isMultipart ? "multipart" : "single"}
    </span>
  );
}

function StatusIcon({ status }: { status: UploadItem["status"] }) {
  if (status === "done") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
  }
  if (status === "error") {
    return <AlertCircle className="h-4 w-4 text-destructive shrink-0" />;
  }
  if (status === "uploading" || status === "confirming") {
    return <Loader2 className="h-4 w-4 text-primary shrink-0 animate-spin" />;
  }
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function FileUploadItem({ item, onRemove }: FileUploadItemProps) {
  const isActive = item.status === "uploading" || item.status === "confirming";
  const isDone = item.status === "done";
  const isError = item.status === "error";
  const canRemove = item.status === "queued" || isError;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-md border p-3 text-sm",
        isError && "border-destructive/30 bg-destructive/5",
        isDone && "border-emerald-200/50 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-950/20",
      )}
    >
      {/* Top row: icon + name + size + type badge + remove */}
      <div className="flex items-center gap-2">
        <StatusIcon status={item.status} />

        <div className="flex-1 min-w-0">
          <p className="truncate font-medium text-foreground leading-none">
            {item.file.name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            {formatBytes(item.file.size)}
            <FileTypeLabel isMultipart={item.isMultipart} />
          </p>
        </div>

        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.file.name}`}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="space-y-0.5">
          {item.progress === -1 ? (
            /* Indeterminate — server-side mode */
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full w-1/3 rounded-full bg-primary animate-[slide_1.2s_ease-in-out_infinite]" />
            </div>
          ) : (
            <Progress value={item.progress} className="h-1.5" />
          )}
          <p className="text-xs text-muted-foreground text-right">
            {item.status === "confirming"
              ? "Confirming…"
              : item.progress === -1
              ? "Uploading via server…"
              : `${item.progress}%`}
          </p>
        </div>
      )}

      {/* Error message */}
      {isError && item.error && (
        <p className="text-xs text-destructive">{item.error}</p>
      )}
    </div>
  );
}
