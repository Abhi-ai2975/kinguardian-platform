// DashboardEditor — full-page editor for a single dashboard.
// In view mode: DashboardGrid is read-only, widgets fetch and display data.
// In edit mode: DashboardWidgetPicker panel appears on the right, drag/resize
// and remove are enabled, and a save button persists the layout.
// The time range is read from the URL "range" param (shared with DateRangePicker).
"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getDashboard,
  updateDashboardMeta,
  deleteDashboard,
  type LayoutItem,
} from "@/lib/dashboards-api";
import { DashboardGrid } from "./DashboardGrid";
import { DashboardWidgetPicker } from "./DashboardWidgetPicker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
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
import { toast } from "sonner";
import { ArrowLeft, Eye, LayoutDashboard, Pencil, Trash2 } from "lucide-react";
import {
  TIME_RANGE_PRESETS,
  DEFAULT_RANGE,
  type TimeRangeKey,
} from "@/lib/time-range";

const PRESET_KEYS = Object.keys(TIME_RANGE_PRESETS) as TimeRangeKey[];

interface DashboardEditorProps {
  id: string;
  orgId: string;
}

export function DashboardEditor({ id, orgId }: DashboardEditorProps) {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [items, setItems] = useState<LayoutItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Shared range param — DateRangePicker writes it, widgets read it.
  const [range] = useQueryState(
    "range",
    parseAsStringLiteral(PRESET_KEYS).withDefault(DEFAULT_RANGE),
  );

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [renaming, setRenaming] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ["dashboard", id],
    queryFn: () => getDashboard(id),
  });

  // Seed local items from the server layout once; subsequent edits are local
  // until the user presses "Save layout" in DashboardGrid.
  useEffect(() => {
    if (dashboard && !initialized) {
      setItems(dashboard.layout ?? []);
      setInitialized(true);
    }
  }, [dashboard, initialized]);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameName.trim()) return;
    setRenaming(true);
    try {
      await updateDashboardMeta(id, { name: renameName.trim() });
      toast.success("Dashboard renamed");
      setRenameOpen(false);
    } catch {
      toast.error("Failed to rename dashboard");
    }
    setRenaming(false);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteDashboard(id);
      toast.success("Dashboard deleted");
      router.push("/dashboards");
    } catch {
      toast.error("Failed to delete dashboard");
      setDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Dashboard not found.</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboards">Back to dashboards</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
          <Link href="/dashboards" aria-label="Back to dashboards">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate leading-tight">{dashboard.name}</h1>
          {dashboard.description && (
            <p className="text-xs text-muted-foreground truncate">{dashboard.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <DateRangePicker />

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRenameName(dashboard.name);
              setRenameOpen(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Rename
          </Button>

          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode((v) => !v)}
          >
            {editMode ? (
              <>
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                View
              </>
            ) : (
              <>
                <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </>
            )}
          </Button>

          {editMode && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteOpen(true)}
              aria-label="Delete dashboard"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Main area — grid + optional picker panel */}
      <div className={editMode ? "flex gap-4 items-start" : undefined}>
        <div className="flex-1 min-w-0">
          {!editMode && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-16 text-center">
              <LayoutDashboard className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium">This dashboard is empty</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click <strong>Edit</strong> to add widgets
                </p>
              </div>
            </div>
          ) : (
            <DashboardGrid
              dashboardId={id}
              items={items}
              orgId={orgId}
              range={range}
              editMode={editMode}
              onItemsChange={setItems}
            />
          )}
        </div>

        {editMode && (
          <DashboardWidgetPicker
            items={items}
            onAdd={(item) => setItems((prev) => [...prev, item])}
          />
        )}
      </div>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename dashboard</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRename} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="rename-input" className="text-xs">
                Name
              </Label>
              <Input
                id="rename-input"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                className="h-8 text-sm"
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRenameOpen(false)}
                disabled={renaming}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={renaming}>
                {renaming ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{dashboard.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the dashboard and all its widget configuration.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
