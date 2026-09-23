/**
 * @file data-table-export-dialog.tsx
 * @description Export customization dialog for data tables. Opens when the
 * user clicks the Export button and lets them configure:
 *
 *   - Scope — All filtered rows / Current page / Selected rows (with counts)
 *   - Columns — Checkboxes to include/exclude individual columns
 *   - Format — CSV / Excel / JSON / PDF toggle buttons
 *   - Filename — editable text input
 *
 * For server-side tables, pass `onExportAll` to handle fetching every
 * matching row (bypassing pagination) when scope = "all" is chosen.
 *
 * @layer shared/tables
 */

"use client";

import type { Table } from "@tanstack/react-table";
import { Check, FileJson, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getExportColumns, rowsToExportData } from "./data-table-export-button";
import {
  exportTable,
  type ExportColumn,
  type ExportFormat,
  type ExportRow,
} from "./export-utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExportScope = "all" | "page" | "selected";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScopeOption({
  label,
  subtitle,
  count,
  active,
  disabled,
  onClick,
}: {
  label: string;
  subtitle?: string;
  count: number;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-all",
        active
          ? "border-foreground bg-muted/50"
          : "border-border hover:border-foreground/30",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-all",
            active ? "border-foreground bg-foreground" : "border-muted-foreground",
          )}
        />
        <div>
          <span className="text-sm font-medium">{label}</span>
          {subtitle && (
            <span className="ml-1.5 text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {count.toLocaleString()} rows
      </span>
    </button>
  );
}

function FormatButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 rounded-md border py-2.5 text-xs font-medium transition-all",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Format metadata
// ---------------------------------------------------------------------------

const FORMAT_META: {
  format: ExportFormat;
  label: string;
  icon: React.ElementType;
}[] = [
  { format: "csv",   label: "CSV",   icon: FileText },
  { format: "excel", label: "Excel", icon: FileSpreadsheet },
  { format: "json",  label: "JSON",  icon: FileJson },
  { format: "pdf",   label: "PDF",   icon: FileText },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableExportDialogProps<TData> {
  table: Table<TData>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filename?: string;
  title?: string;
  onExportAll?: (
    format: ExportFormat,
    columns: ExportColumn[],
  ) => Promise<void> | void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Export customization dialog.
 *
 * Scope picker → column selector → format toggles → filename input → Export.
 *
 * @param table - TanStack Table instance.
 * @param open - Whether the dialog is visible.
 * @param onOpenChange - Open/close callback.
 * @param filename - Default downloaded file base name.
 * @param title - Human-readable dataset name used in the header and PDF.
 * @param onExportAll - Server-side full-export handler.
 */
export function DataTableExportDialog<TData>({
  table,
  open,
  onOpenChange,
  filename: filenameProp = "export",
  title = "Data",
  onExportAll,
}: DataTableExportDialogProps<TData>) {
  const filteredRows = table.getFilteredRowModel().rows;
  const pageRows     = table.getRowModel().rows;
  const selectedRows = table.getFilteredSelectedRowModel().rows;

  const [scope,    setScope]    = React.useState<ExportScope>("all");
  const [format,   setFormat]   = React.useState<ExportFormat>("csv");
  const [filename, setFilename] = React.useState(filenameProp);
  const [loading,  setLoading]  = React.useState(false);

  const allExportColumns = React.useMemo(
    () => getExportColumns(table),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, open],
  );

  const [enabledColIds, setEnabledColIds] = React.useState<Set<string>>(
    () => new Set(allExportColumns.map((c) => c.id)),
  );

  React.useEffect(() => {
    setEnabledColIds(new Set(allExportColumns.map((c) => c.id)));
  }, [allExportColumns]);

  React.useEffect(() => {
    setFilename(filenameProp);
  }, [filenameProp]);

  React.useEffect(() => {
    if (open && selectedRows.length > 0) setScope("selected");
    else if (open) setScope("all");
  }, [open, selectedRows.length]);

  const selectedColumns = React.useMemo(
    () => allExportColumns.filter((c) => enabledColIds.has(c.id)),
    [allExportColumns, enabledColIds],
  );

  const allColsSelected = enabledColIds.size === allExportColumns.length;
  const noColsSelected  = enabledColIds.size === 0;

  const toggleColumn = React.useCallback((id: string) => {
    setEnabledColIds((prev) => {
      if (prev.has(id)) {
        if (prev.size === 1) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      }
      return new Set([...prev, id]);
    });
  }, []);

  const selectAllColumns  = React.useCallback(() => {
    setEnabledColIds(new Set(allExportColumns.map((c) => c.id)));
  }, [allExportColumns]);

  const clearAllColumns = React.useCallback(() => {
    setEnabledColIds(new Set([allExportColumns[0]?.id].filter(Boolean)));
  }, [allExportColumns]);

  const handleExport = React.useCallback(async () => {
    setLoading(true);
    try {
      const cols = selectedColumns;
      const safeFilename = filename.trim() || "export";

      if (scope === "all" && onExportAll) {
        await onExportAll(format, cols);
        onOpenChange(false);
        return;
      }

      const sourceRows: typeof filteredRows =
        scope === "selected" ? selectedRows :
        scope === "page"     ? pageRows :
                               filteredRows;

      const exportRows: ExportRow[] = rowsToExportData(sourceRows, cols);
      await exportTable(format, exportRows, cols, safeFilename, title);
      onOpenChange(false);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setLoading(false);
    }
  }, [
    scope, format, filename, title,
    selectedColumns, filteredRows, pageRows, selectedRows,
    onExportAll, onOpenChange,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            Export &ldquo;{title}&rdquo;
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-1">
          {/* Scope */}
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Export scope
            </Label>
            <div className="flex flex-col gap-1.5">
              <ScopeOption
                label="All filtered rows"
                subtitle={onExportAll ? "(server)" : undefined}
                count={filteredRows.length}
                active={scope === "all"}
                onClick={() => setScope("all")}
              />
              <ScopeOption
                label="Current page"
                count={pageRows.length}
                active={scope === "page"}
                onClick={() => setScope("page")}
              />
              <ScopeOption
                label="Selected rows"
                count={selectedRows.length}
                active={scope === "selected"}
                disabled={selectedRows.length === 0}
                onClick={() => setScope("selected")}
              />
            </div>
          </div>

          {/* Columns */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Columns
              </Label>
              <div className="flex gap-2">
                {!allColsSelected && (
                  <button
                    type="button"
                    onClick={selectAllColumns}
                    className="text-[10px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    Select all
                  </button>
                )}
                {!noColsSelected && allExportColumns.length > 1 && (
                  <button
                    type="button"
                    onClick={clearAllColumns}
                    className="text-[10px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <ScrollArea className="max-h-40 rounded-md border">
              <div className="flex flex-col divide-y">
                {allExportColumns.map((col) => {
                  const checked = enabledColIds.has(col.id);
                  const isLast  = checked && enabledColIds.size === 1;
                  return (
                    <div
                      key={col.id}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 transition-colors",
                        !isLast && "cursor-pointer hover:bg-muted/50",
                        isLast && "cursor-not-allowed",
                      )}
                      onClick={() => !isLast && toggleColumn(col.id)}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={isLast}
                        onCheckedChange={() => !isLast && toggleColumn(col.id)}
                        aria-label={`Include ${col.label} in export`}
                      />
                      <span className="text-sm">{col.label}</span>
                      {checked && (
                        <Check className="ml-auto size-3 text-primary" />
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <p className="text-[10px] text-muted-foreground">
              {enabledColIds.size} of {allExportColumns.length} columns included
            </p>
          </div>

          {/* Format */}
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Format
            </Label>
            <div className="flex gap-1.5">
              {FORMAT_META.map(({ format: f, label, icon }) => (
                <FormatButton
                  key={f}
                  label={label}
                  icon={icon}
                  active={format === f}
                  onClick={() => setFormat(f)}
                />
              ))}
            </div>
          </div>

          {/* Filename */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="export-filename"
              className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Filename
            </Label>
            <div className="flex items-center gap-0">
              <Input
                id="export-filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="h-8 rounded-r-none text-sm"
                placeholder="export"
              />
              <div className="flex h-8 items-center rounded-r-md border border-l-0 bg-muted px-2.5 text-xs text-muted-foreground">
                .{format === "excel" ? "xlsx" : format}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={loading || noColsSelected}
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-3 animate-spin" />
                Exporting…
              </span>
            ) : (
              "Export"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
