// DashboardListClient — lists all dashboards for the org and provides
// create / delete actions. Designed to be rendered by the server page which
// passes the resolved orgId so we never expose a client-side session lookup.
"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  listDashboards,
  createDashboard,
  deleteDashboard,
  type DashboardSummary,
} from "@/lib/dashboards-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { LayoutDashboard, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface DashboardListClientProps {
  orgId: string;
}

export function DashboardListClient({ orgId }: DashboardListClientProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DashboardSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: dashboards, isLoading } = useQuery({
    queryKey: ["dashboards", orgId],
    queryFn: () => listDashboards(orgId),
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const dashboard = await createDashboard(orgId, newName.trim(), newDesc.trim() || undefined);
      toast.success("Dashboard created");
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      router.push(`/dashboards/${dashboard.id}`);
    } catch {
      toast.error("Failed to create dashboard");
    }
    setCreating(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDashboard(deleteTarget.id);
      toast.success("Dashboard deleted");
      qc.invalidateQueries({ queryKey: ["dashboards", orgId] });
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete dashboard");
    }
    setDeleting(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboards</h1>
          <p className="text-sm text-muted-foreground">Build and share custom views of your telemetry</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New dashboard
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : dashboards?.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed py-16 text-center">
          <LayoutDashboard className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium">No dashboards yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first dashboard to start building custom views
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            New dashboard
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboards?.map((d) => (
            <div
              key={d.id}
              className="group relative rounded-lg border bg-card p-4 hover:border-ring transition-colors"
            >
              {/* Full-card link sits behind the dropdown */}
              <Link
                href={`/dashboards/${d.id}`}
                className="absolute inset-0 rounded-lg"
                aria-label={`Open ${d.name}`}
              />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                    {d.name}
                  </p>
                  {d.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{d.description}</p>
                  )}
                </div>
                {/* z-10 keeps the dropdown above the card link */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative z-10 h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="relative z-10">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboards/${d.id}`}>Open</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(d)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Updated {formatDate(d.updatedAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New dashboard</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="dash-name" className="text-xs">
                Name
              </Label>
              <Input
                id="dash-name"
                placeholder="e.g. API Performance"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 text-sm"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dash-desc" className="text-xs">
                Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="dash-desc"
                placeholder="What does this dashboard track?"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={creating}>
                {creating ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the dashboard and all its widget configuration.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
