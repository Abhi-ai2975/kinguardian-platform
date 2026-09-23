"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  exportToCSV,
  exportToJSON,
  exportToXLSX,
  exportToPDF,
  exportChartAsPNG,
  exportChartAsJPEG,
  exportChartAsSVG,
  type ExportColumn,
} from "../utils/export";
import type { DataTableQueryParams } from "../types";

// ── Table Export ─────────────────────────────────────────────────────────────

export interface TableExportOptions {
  columns: ExportColumn[];
  allRows: Record<string, any>[];
  currentPageRows: Record<string, any>[];
  selectedRows: Record<string, any>[];
  url?: string;
  queryParams?: DataTableQueryParams;
  title?: string;
}

// ── Chart Export ─────────────────────────────────────────────────────────────

export interface ChartExportOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  title?: string;
}

// ── Props ────────────────────────────────────────────────────────────────────

type ExportDialogProps =
  | { open: boolean; onClose: () => void; mode: "table"; options: TableExportOptions }
  | { open: boolean; onClose: () => void; mode: "chart"; options: ChartExportOptions };

// ── Format button ─────────────────────────────────────────────────────────────

function FormatButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md border py-2 text-xs font-medium transition-all",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

// ── Scope radio ───────────────────────────────────────────────────────────────

function ScopeOption({
  label,
  count,
  active,
  onClick,
  disabled,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
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
            "h-3.5 w-3.5 rounded-full border-2 transition-all",
            active ? "border-foreground bg-foreground" : "border-muted-foreground",
          )}
        />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground">{count.toLocaleString()} rows</span>
    </button>
  );
}

// ── Table Export Dialog ───────────────────────────────────────────────────────

type TableScope = "all" | "page" | "selected";
type TableFormat = "csv" | "json" | "xlsx" | "pdf";

function TableExportDialog({
  options,
  onClose,
}: {
  options: TableExportOptions;
  onClose: () => void;
}) {
  const { columns, allRows, currentPageRows, selectedRows, url, queryParams, title } =
    options;

  const hasServerSide = !!(url && queryParams?.supported?.length);
  const hasSelection = selectedRows.length > 0;

  const [scope, setScope] = useState<TableScope>("all");
  const [format, setFormat] = useState<TableFormat>("csv");
  const [loading, setLoading] = useState(false);
  const [exportLimit, setExportLimit] = useState(
    queryParams?.maxExportLimit ?? 1000,
  );
  const [filters, setFilters] = useState<Record<string, string>>({});

  // The filter params are supported params minus pagination/sort/search controls
  const paginationKeys = new Set([
    queryParams?.pageParam,
    queryParams?.limitParam,
    queryParams?.sortParam,
    queryParams?.searchParam,
  ]);
  const filterParams = (queryParams?.supported ?? []).filter(
    (p) => !paginationKeys.has(p),
  );

  const getFilename = () => {
    const base = title ?? "export";
    return `${base.toLowerCase().replace(/\s+/g, "-")}.${format === "pdf" ? "pdf" : format}`;
  };

  const fetchAllFromServer = async (): Promise<Record<string, any>[]> => {
    const qp: Record<string, any> = {
      ...(queryParams?.defaults ?? {}),
      ...filters,
    };
    if (queryParams?.limitParam) qp[queryParams.limitParam] = exportLimit;
    if (queryParams?.pageParam) qp[queryParams.pageParam] = 1;

    const res = await fetch("/api/data-fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        queryParams: qp,
        dataPath: queryParams?.dataPath,
        totalPath: queryParams?.totalPath,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Fetch failed");

    let rows: Record<string, any>[] = json.rows ?? [];
    if (queryParams?.rowMapping) {
      rows = rows.map((raw) => applyRowMapping(raw, queryParams.rowMapping!));
    }
    return rows;
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      let rows: Record<string, any>[];

      if (scope === "selected") {
        rows = selectedRows;
      } else if (scope === "page") {
        rows = currentPageRows;
      } else if (hasServerSide) {
        rows = await fetchAllFromServer();
      } else {
        rows = allRows;
      }

      const filename = getFilename();
      if (format === "csv") exportToCSV(filename, columns, rows);
      else if (format === "json") exportToJSON(filename, rows);
      else if (format === "xlsx") exportToXLSX(filename, columns, rows);
      else exportToPDF(filename, columns, rows, title);

      onClose();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Scope */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Export scope
        </Label>
        <div className="flex flex-col gap-1.5">
          <ScopeOption
            label="All data"
            count={hasServerSide ? exportLimit : allRows.length}
            active={scope === "all"}
            onClick={() => setScope("all")}
          />
          <ScopeOption
            label="Current page"
            count={currentPageRows.length}
            active={scope === "page"}
            onClick={() => setScope("page")}
          />
          <ScopeOption
            label="Selected rows"
            count={selectedRows.length}
            active={scope === "selected"}
            onClick={() => setScope("selected")}
            disabled={!hasSelection}
          />
        </div>
      </div>

      {/* Server-side options — only when scope = all + server mode */}
      {scope === "all" && hasServerSide && (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Customize export
          </Label>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-foreground">
              Row limit{" "}
              <span className="text-muted-foreground">
                (max {(queryParams?.maxExportLimit ?? 10000).toLocaleString()})
              </span>
            </Label>
            <Input
              type="number"
              value={exportLimit}
              min={1}
              max={queryParams?.maxExportLimit ?? 10000}
              onChange={(e) => setExportLimit(Number(e.target.value))}
              className="h-8 text-sm"
            />
          </div>
          {filterParams.map((param) => (
            <div key={param} className="flex flex-col gap-1.5">
              <Label className="text-xs text-foreground">
                {queryParams?.filterLabels?.[param] ?? param}
              </Label>
              <Input
                value={filters[param] ?? ""}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, [param]: e.target.value }))
                }
                placeholder={`Filter by ${queryParams?.filterLabels?.[param] ?? param}…`}
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>
      )}

      {/* Format */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Format
        </Label>
        <div className="flex gap-1.5">
          {(["csv", "json", "xlsx", "pdf"] as TableFormat[]).map((f) => (
            <FormatButton
              key={f}
              label={f.toUpperCase()}
              active={format === f}
              onClick={() => setFormat(f)}
            />
          ))}
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleExport} disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent" />
              Exporting…
            </span>
          ) : (
            "Export"
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ── Chart Export Dialog ───────────────────────────────────────────────────────

type ChartFormat = "png" | "jpg" | "svg";
type ChartResolution = 1 | 2;

function ChartExportDialog({
  options,
  onClose,
}: {
  options: ChartExportOptions;
  onClose: () => void;
}) {
  const { containerRef, title } = options;
  const [format, setFormat] = useState<ChartFormat>("png");
  const [resolution, setResolution] = useState<ChartResolution>(2);
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!containerRef.current) return;
    setLoading(true);
    const base = (title ?? "chart").toLowerCase().replace(/\s+/g, "-");
    try {
      if (format === "png") await exportChartAsPNG(containerRef.current, `${base}.png`, resolution);
      else if (format === "jpg") await exportChartAsJPEG(containerRef.current, `${base}.jpg`, resolution);
      else await exportChartAsSVG(containerRef.current, `${base}.svg`);
      onClose();
    } catch (err) {
      console.error("Chart export failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Format */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Format
        </Label>
        <div className="flex gap-1.5">
          {(["png", "jpg", "svg"] as ChartFormat[]).map((f) => (
            <FormatButton
              key={f}
              label={f.toUpperCase()}
              active={format === f}
              onClick={() => setFormat(f)}
            />
          ))}
        </div>
      </div>

      {/* Resolution — not applicable for SVG */}
      {format !== "svg" && (
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Resolution
          </Label>
          <div className="flex flex-col gap-1.5">
            {([1, 2] as ChartResolution[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setResolution(r)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all",
                  resolution === r
                    ? "border-foreground bg-muted/50"
                    : "border-border hover:border-foreground/30",
                )}
              >
                <div
                  className={cn(
                    "h-3.5 w-3.5 rounded-full border-2 transition-all",
                    resolution === r
                      ? "border-foreground bg-foreground"
                      : "border-muted-foreground",
                  )}
                />
                <div>
                  <span className="text-sm font-medium">
                    {r === 1 ? "Standard" : "High-res"}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {r}×
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleExport} disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent" />
              Exporting…
            </span>
          ) : (
            "Export"
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ── Root ExportDialog ─────────────────────────────────────────────────────────

export function ExportDialog(props: ExportDialogProps) {
  const title =
    props.mode === "table"
      ? `Export${props.options.title ? ` "${props.options.title}"` : " Data"}`
      : "Export Chart";

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>
        {props.mode === "table" ? (
          <TableExportDialog options={props.options} onClose={props.onClose} />
        ) : (
          <ChartExportDialog options={props.options} onClose={props.onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyRowMapping(
  raw: Record<string, any>,
  mapping: Record<string, string>,
): Record<string, any> {
  const result: Record<string, any> = { ...raw };
  for (const [colKey, fieldPath] of Object.entries(mapping)) {
    result[colKey] = fieldPath
      .split(".")
      .reduce((o: any, k) => o?.[k], raw);
  }
  return result;
}
