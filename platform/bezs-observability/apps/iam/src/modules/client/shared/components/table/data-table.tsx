"use client";

import React, { useEffect, useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  Row,
} from "@tanstack/react-table";

import { cn } from "@/lib/utils";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Loader2,
  Plus,
  Search,
  TriangleAlert,
  X,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";

/* =========================
   Types
========================= */

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

type ViewMode = "table" | "card";

type DataTableAdditionalType<TData> = {
  label?: string;
  dataSize?: string | number;
  addLabelName?: string;
  fallbackText?: string;
  searchField?: string;
  AddButtonIcon?: React.ReactNode;
  isAddButton?: boolean;
  filterField?: string;
  filterFieldLabel?: string;
  filterValues?: any[];
  customFilterField?: string | null;
  customFilterValue?: string | null;
  isLoading?: boolean;
  error?: string | null;
  openModal?: () => void;
  isBorder?: boolean;

  // View mode (Tabs)
  defaultView?: ViewMode; // uncontrolled initial
  view?: ViewMode; // controlled
  onViewChange?: (v: ViewMode) => void; // controlled
  cardRender?: (row: Row<TData>) => React.ReactNode; // renderer for a single card
  cardColsClassName?: string; // grid columns for card view
};

/* =========================
   Component
========================= */

export function DataTable<TData, TValue>({
  columns,
  data,
  label,
  dataSize = 0,
  isAddButton = true,
  AddButtonIcon = <Plus />,
  addLabelName = "Add LabelName",
  fallbackText = "No results",
  searchField = "",
  filterField = "",
  filterFieldLabel = "",
  customFilterField = null,
  customFilterValue = null,
  filterValues = [],
  isLoading = false,
  error = null,
  openModal,
  isBorder = true,

  defaultView = "table",
  view,
  onViewChange,
  cardRender,
  cardColsClassName = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
}: DataTableProps<TData, TValue> & DataTableAdditionalType<TData>) {
  const [pageSize, setPageSize] = useState<number>(5);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [internalView, setInternalView] = useState<ViewMode>(defaultView);

  const activeView: ViewMode = view ?? internalView;
  const setView = (v: ViewMode) =>
    onViewChange ? onViewChange(v) : setInternalView(v);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
  });

  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!filterField) return;

    const column = table.getColumn(customFilterField || filterField);
    if (!column) return;

    column.setFilterValue(customFilterValue ?? undefined);
    table.setPageIndex(0);
  }, [customFilterField, customFilterValue, filterField, table]);

  if (!isMounted) return null;

  const handlePageSizeChange = (value: string) => {
    const n = Number(value);
    setPageSize(n);
    table.setPageSize(n);
  };

  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-4 w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-6 justify-between flex-wrap">
        <div className="flex gap-4 items-center">
          {label && (
            <h1 className="text-lg font-semibold">
              {label} ({dataSize})
            </h1>
          )}
          {isLoading && <Loader2 className="animate-spin w-5 h-5" />}
          {error && <p className="text-destructive">{error}</p>}
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          {/* Search */}
          {searchField && (
            <div className="relative">
              <Input
                className="max-w-[240px] pl-7 h-8"
                placeholder={`Search ${searchField}...`}
                value={
                  (table.getColumn(searchField)?.getFilterValue() as string) ||
                  ""
                }
                onChange={(e) =>
                  table.getColumn(searchField)?.setFilterValue(e.target.value)
                }
              />
              <Search className="w-4 h-4 text-muted-foreground absolute top-[25%] left-1.5" />
            </div>
          )}

          {/* Filter */}
          {filterValues.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "cursor-pointer"
                )}
              >
                <ListFilter className="mr-2 h-4 w-4" /> Filter
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  Filter by {filterFieldLabel || filterField}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {filterValues.map((value, index) => {
                  const isActive =
                    table.getColumn(filterField)?.getFilterValue() === value;
                  return (
                    <DropdownMenuItem
                      key={index}
                      onClick={() =>
                        table.getColumn(filterField)?.setFilterValue(value)
                      }
                    >
                      {value}{" "}
                      {isActive && <Check className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                  );
                })}
                {(table.getColumn(filterField)?.getFilterValue() as string) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        table.getColumn(filterField)?.setFilterValue(undefined)
                      }
                    >
                      <X className="mr-2 h-4 w-4" /> Reset
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Add */}
          {isAddButton && (
            <Button size="sm" className="cursor-pointer" onClick={openModal}>
              <span className="mr-2 h-4 w-4 inline-flex">{AddButtonIcon}</span>{" "}
              {addLabelName}
            </Button>
          )}

          {/* View Tabs */}
          {cardRender && (
            <Tabs
              value={activeView}
              onValueChange={(v) => setView(v as ViewMode)}
            >
              <TabsList className="h-8">
                <TabsTrigger value="table" className="gap-2">
                  <TableIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Table</span>
                </TabsTrigger>
                <TabsTrigger value="card" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Cards</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </div>

      {/* Content via Tabs */}
      <Tabs
        value={activeView}
        onValueChange={(v) => setView(v as ViewMode)}
        className="w-full"
      >
        {/* TABLE VIEW */}
        <TabsContent value="table" className="mt-0">
          <div className={cn(isBorder && "rounded-md border", "w-full")}>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead key={header.id}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {rows.length ? (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <TriangleAlert className="h-4 w-4" /> {fallbackText}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* CARD VIEW */}
        <TabsContent value="card" className="mt-0">
          {rows.length ? (
            <div className={cn("grid gap-4", cardColsClassName)}>
              {rows.map((row) => (
                <React.Fragment key={row.id}>
                  {cardRender ? (
                    cardRender(row)
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Item</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        Provide a <code>cardRender</code> prop to render cards.
                      </CardContent>
                      <CardFooter />
                    </Card>
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div
              className={cn(
                isBorder && "rounded-md border",
                "w-full p-8 text-center"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <TriangleAlert className="h-4 w-4" /> {fallbackText}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-end gap-6">
        <div className="flex items-center gap-2">
          <p className="text-sm">Rows per page</p>
          <Select
            value={pageSize.toString()}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger className="w-fit h-8">
              <SelectValue placeholder="Select a page Size" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="25">25</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm font-semibold">{`Page ${
          table.getPageCount() === 0
            ? 0
            : table.getState().pagination.pageIndex + 1
        } of ${table.getPageCount()}`}</p>

        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
