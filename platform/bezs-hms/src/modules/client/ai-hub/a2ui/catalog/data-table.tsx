"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type PaginationState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import { ExportDialog } from "../components/export-dialog";
import type { DataTableNode, DataTableColumn, DataTableQueryParams } from "../types";
import type { IMessageProcessor } from "../rendering/processor";

interface Props {
  processor: IMessageProcessor;
  surfaceId: string;
  component: DataTableNode;
  weight?: string | number;
}

function applyRowMapping(
  raw: Record<string, any>,
  mapping: Record<string, string>,
): Record<string, any> {
  const result: Record<string, any> = { ...raw };
  for (const [colKey, fieldPath] of Object.entries(mapping)) {
    result[colKey] = fieldPath.split(".").reduce((o: any, k) => o?.[k], raw);
  }
  return result;
}

function SortIcon({ state }: { state: false | "asc" | "desc" }) {
  if (state === "asc") return <ArrowUp className="ml-1 inline h-3 w-3" />;
  if (state === "desc") return <ArrowDown className="ml-1 inline h-3 w-3" />;
  return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
}

export function DataTable({ processor, surfaceId, component, weight = "initial" }: Props) {
  const { resolvePrimitive } = useDynamicComponent(processor, surfaceId, component, weight);

  const props = component.properties;
  const columns: DataTableColumn[] = props.columns ?? [];
  const qp: DataTableQueryParams | undefined = props.queryParams;
  const isServerSide = !!(props.url && qp?.supported?.length);

  // ── State ──────────────────────────────────────────────────────────────────
  const [rows, setRows] = useState<Record<string, any>[]>(
    () => resolvePrimitive(props.rows) ?? [],
  );
  const [totalRows, setTotalRows] = useState(
    props.pagination?.total ?? (resolvePrimitive(props.rows) ?? []).length,
  );
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: props.pagination?.pageSize ?? 20,
  });
  const [exportOpen, setExportOpen] = useState(false);

  // ── Server fetch ───────────────────────────────────────────────────────────
  const fetchPage = useCallback(
    async (params: {
      page: number;
      pageSize: number;
      sortBy?: string;
      sortDesc?: boolean;
      search?: string;
    }) => {
      if (!isServerSide || !props.url) return;
      setLoading(true);
      try {
        const queryParams: Record<string, any> = { ...(qp?.defaults ?? {}) };
        if (qp?.pageParam) queryParams[qp.pageParam] = params.page + 1;
        if (qp?.offsetParam) queryParams[qp.offsetParam] = params.page * params.pageSize;
        if (qp?.limitParam) queryParams[qp.limitParam] = params.pageSize;
        if (params.sortBy && qp?.sortParam)
          queryParams[qp.sortParam] = params.sortDesc ? `-${params.sortBy}` : params.sortBy;
        if (params.search && qp?.searchParam)
          queryParams[qp.searchParam] = params.search;

        const res = await fetch("/api/data-fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: props.url,
            queryParams,
            dataPath: qp?.dataPath,
            totalPath: qp?.totalPath,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);

        let fetched: Record<string, any>[] = json.rows ?? [];
        if (qp?.rowMapping) fetched = fetched.map((r) => applyRowMapping(r, qp.rowMapping!));
        setRows(fetched);
        setTotalRows(json.total ?? fetched.length);
      } catch (e) {
        console.error("DataTable fetch error:", e);
      } finally {
        setLoading(false);
      }
    },
    [isServerSide, props.url, qp],
  );

  // ── TanStack columns ───────────────────────────────────────────────────────
  const tanstackColumns = useMemo<ColumnDef<Record<string, any>>[]>(
    () => [
      {
        id: "_select",
        size: 40,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
      },
      ...columns.map((col) => ({
        id: col.key,
        accessorKey: col.key,
        size: col.width ? parseInt(col.width) : undefined,
        header: ({ column }: any) =>
          col.sortable ? (
            <button
              className="flex items-center text-left hover:text-foreground"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              {col.label}
              <SortIcon state={column.getIsSorted()} />
            </button>
          ) : (
            col.label
          ),
        cell: ({ getValue }: any) => {
          const v = getValue();
          if (v == null) return <span className="text-muted-foreground/50">—</span>;
          if (typeof v === "boolean") return v ? "Yes" : "No";
          return String(v);
        },
      })),
    ],
    [columns],
  );

  // ── Table instance ─────────────────────────────────────────────────────────
  const table = useReactTable({
    data: rows,
    columns: tanstackColumns,
    rowCount: isServerSide ? totalRows : undefined,
    manualPagination: isServerSide,
    manualSorting: isServerSide,
    manualFiltering: isServerSide,
    state: { sorting, rowSelection, globalFilter, pagination },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(next);
      if (isServerSide) {
        fetchPage({
          page: pagination.pageIndex,
          pageSize: pagination.pageSize,
          sortBy: next[0]?.id,
          sortDesc: next[0]?.desc,
          search: globalFilter,
        });
      }
    },
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: (value) => {
      setGlobalFilter(value);
      if (isServerSide) {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
        fetchPage({ page: 0, pageSize: pagination.pageSize, search: value });
      }
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(pagination) : updater;
      setPagination(next);
      if (isServerSide) {
        fetchPage({
          page: next.pageIndex,
          pageSize: next.pageSize,
          sortBy: sorting[0]?.id,
          sortDesc: sorting[0]?.desc,
          search: globalFilter,
        });
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
  });

  const selectedRows = table
    .getSelectedRowModel()
    .rows.map((r) => r.original);
  const currentPageRows = table
    .getRowModel()
    .rows.map((r) => r.original);

  const pageSizeOptions = props.pagination?.pageSizeOptions ?? [10, 20, 50, 100];

  const displayedTotal = isServerSide ? totalRows : table.getFilteredRowModel().rows.length;
  const start = pagination.pageIndex * pagination.pageSize + 1;
  const end = Math.min((pagination.pageIndex + 1) * pagination.pageSize, displayedTotal);

  return (
    <div
      className={cn("flex flex-col gap-3", component.className)}
      style={{ flex: weight }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {props.title && (
          <h3 className="text-sm font-semibold text-foreground">{props.title}</h3>
        )}
        <div className="ml-auto flex items-center gap-2">
          {selectedRows.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedRows.length} selected
            </Badge>
          )}
          {props.exportFormats?.length ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setExportOpen(true)}
            >
              <Download className="h-3 w-3" />
              Export
            </Button>
          ) : null}
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────── */}
      {props.searchable && (
        <Input
          placeholder={props.searchPlaceholder ?? "Search…"}
          value={globalFilter}
          onChange={(e) => table.setGlobalFilter(e.target.value)}
          className="h-8 max-w-xs text-sm"
        />
      )}

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="relative rounded-md border">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/60 backdrop-blur-[1px]">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="hover:bg-transparent">
                  {hg.headers.map((h) => (
                    <TableHead
                      key={h.id}
                      style={h.column.getSize() !== 150 ? { width: h.column.getSize() } : undefined}
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className="text-sm"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={tanstackColumns.length}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Pagination footer ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger className="h-7 w-[64px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <span className="mr-2">
            {displayedTotal === 0 ? "0" : `${start}–${end}`} of{" "}
            {displayedTotal.toLocaleString()}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Export dialog ───────────────────────────────────────────────── */}
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        mode="table"
        options={{
          columns,
          allRows: rows,
          currentPageRows,
          selectedRows,
          url: props.url,
          queryParams: qp,
          title: props.title,
        }}
      />
    </div>
  );
}
