// Admin users page — searchable/filterable table of all platform users.
// Actions: ban/unban, change role, revoke sessions, delete.
"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  flexRender,
} from "@tanstack/react-table";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Search,
  ShieldBan,
  ShieldCheck,
  UserX,
  LogOut,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string | null;
  banned: boolean | null;
  createdAt: string;
}

const ROLE_OPTIONS = ["user", "admin", "superadmin"];

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const { data, isLoading } = useQuery<{ users: AdminUser[]; total: number }>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users?limit=500");
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async ({
      id,
      action,
      role,
    }: {
      id: string;
      action: string;
      role?: string;
    }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, role }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
    },
    onSuccess: (_, vars) => {
      const labels: Record<string, string> = {
        ban: "User banned",
        unban: "User unbanned",
        "set-role": "Role updated",
        "revoke-sessions": "Sessions revoked",
      };
      toast.success(labels[vars.action] ?? "Done");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
    },
    onSuccess: () => {
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        accessorKey: "name",
        header: "User",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
              {(row.original.name || row.original.email)[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {row.original.name || "—"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {row.original.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
          const role = row.original.role ?? "user";
          return (
            <Badge
              variant={role === "superadmin" ? "destructive" : role === "admin" ? "default" : "secondary"}
              className="text-xs capitalize"
            >
              {role}
            </Badge>
          );
        },
        filterFn: (row, _, value) => value.includes(row.original.role ?? "user"),
      },
      {
        accessorKey: "banned",
        header: "Status",
        cell: ({ row }) =>
          row.original.banned ? (
            <Badge variant="destructive" className="text-xs">Banned</Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-green-600 border-green-300">Active</Badge>
          ),
        filterFn: (row, _, value) =>
          value === "all" ||
          (value === "banned" ? !!row.original.banned : !row.original.banned),
      },
      {
        accessorKey: "emailVerified",
        header: "Verified",
        cell: ({ row }) => (
          <span className={row.original.emailVerified ? "text-green-500" : "text-muted-foreground"}>
            {row.original.emailVerified ? "Yes" : "No"}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-xs font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Joined
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        ),
        cell: ({ row }) =>
          new Date(row.original.createdAt).toLocaleDateString(),
        sortingFn: "datetime",
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const user = row.original;
          const isBanned = !!user.banned;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {isBanned ? (
                  <DropdownMenuItem
                    onClick={() => mutation.mutate({ id: user.id, action: "unban" })}
                  >
                    <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                    Unban user
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => mutation.mutate({ id: user.id, action: "ban" })}
                    className="text-yellow-600"
                  >
                    <ShieldBan className="mr-2 h-3.5 w-3.5" />
                    Ban user
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {ROLE_OPTIONS.filter((r) => r !== (user.role ?? "user")).map((role) => (
                  <DropdownMenuItem
                    key={role}
                    onClick={() =>
                      mutation.mutate({ id: user.id, action: "set-role", role })
                    }
                  >
                    Set as {role}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    mutation.mutate({ id: user.id, action: "revoke-sessions" })
                  }
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Revoke sessions
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (confirm(`Delete ${user.email}? This cannot be undone.`)) {
                      deleteMutation.mutate(user.id);
                    }
                  }}
                >
                  <UserX className="mr-2 h-3.5 w-3.5" />
                  Delete user
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [mutation, deleteMutation]
  );

  // Client-side search filter
  const filtered = useMemo(() => {
    const users = data?.users ?? [];
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [data?.users, search]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total} total users` : "All platform users"}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="text-xs">
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  );
}
