/**
 * ProjectsCard — grid-view card for a single project row.
 *
 * Mirrors the information shown in the table columns (name, slug, provider,
 * mode, created_at) plus quick-action buttons. The top-left checkbox is wired
 * to TanStack Table's row-selection state so that selection is shared across
 * both the table and grid views.
 *
 * @module
 */
"use client";

import * as React from "react";
import type { Row } from "@tanstack/react-table";
import { Files, Settings, Trash2, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDate } from "@/modules/client/shared/components/tables";
import { projectStore } from "@/modules/client/projects/stores/project.store";
import type { TProjectRow } from "@/modules/client/projects/types/project.type";

const PROVIDER_LABELS: Record<string, string> = {
  s3: "S3",
  azure_blob: "Azure",
  gcs: "GCS",
  minio: "MinIO",
  r2: "R2",
  rustfs: "RustFS",
};

interface ProjectsCardProps {
  row: Row<TProjectRow>;
}

export function ProjectsCard({ row }: ProjectsCardProps) {
  const project = row.original;
  const isSelected = row.getIsSelected();

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors",
        isSelected && "border-primary/50 bg-primary/5",
      )}
    >
      {/* Selection checkbox */}
      <div className="absolute top-3 left-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select project"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* More actions menu */}
      <div className="absolute top-2 right-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Project actions"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                window.location.href = `/projects/${project.id}/files`;
              }}
            >
              <Files className="size-4" />
              Open files
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                window.location.href = `/projects/${project.id}/settings`;
              }}
            >
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                projectStore.getState().onOpen("deleteProject", project)
              }
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Project info — padded to clear the checkbox */}
      <div className="pl-6 pr-6 pt-1">
        <p className="font-medium text-sm leading-tight line-clamp-1">
          {project.name}
        </p>
        <p className="text-xs text-muted-foreground font-mono mt-0.5 line-clamp-1">
          {project.slug}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="text-xs">
          {PROVIDER_LABELS[project.storage_provider] ?? project.storage_provider}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {project.storage_mode === "managed" ? "Managed" : "BYOB"}
        </span>
      </div>

      <div className="flex items-center justify-between mt-auto pt-2 border-t">
        <span className="text-xs text-muted-foreground">
          {formatDate(project.created_at)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs px-2 gap-1"
          onClick={() => {
            window.location.href = `/projects/${project.id}/files`;
          }}
        >
          <Files className="size-3" />
          Open
        </Button>
      </div>
    </div>
  );
}
