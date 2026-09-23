/**
 * UploadConfigPanel — upload mode, folder, tags, and metadata configuration.
 *
 * Controlled component — all state lives in the parent (FileUploadModal).
 * This panel exists purely as a visual grouping of the upload options.
 *
 * Upload mode:
 *   presigned — browser PUTs bytes directly to S3 (recommended, shows granular progress)
 *   server    — Next.js server proxies the upload; useful for inspecting server-side
 *               validation, virus scan triggers, and metadata without needing direct S3 access
 *
 * @module
 */
"use client";

import { X, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderPickerPopover } from "@/modules/client/files/components/FolderPickerPopover";
import type { TFolderList } from "@/modules/entities/schemas/folder";

export type UploadMode = "presigned" | "server";

export interface MetadataEntry {
  key: string;
  value: string;
}

interface UploadConfigPanelProps {
  uploadMode: UploadMode;
  onUploadModeChange: (mode: UploadMode) => void;
  folderId: string | null;
  onFolderChange: (id: string | null) => void;
  folders: TFolderList;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  metadataEntries: MetadataEntry[];
  onMetadataChange: (entries: MetadataEntry[]) => void;
  disabled?: boolean;
}

export function UploadConfigPanel({
  uploadMode,
  onUploadModeChange,
  folderId,
  onFolderChange,
  folders,
  tags,
  onTagsChange,
  metadataEntries,
  onMetadataChange,
  disabled,
}: UploadConfigPanelProps) {
  // ── Tag handling ───────────────────────────────────────────────────────────

  const commitTagInput = (input: HTMLInputElement) => {
    const val = input.value.trim().toLowerCase().replace(/,/g, "");
    if (val && !tags.includes(val)) {
      onTagsChange([...tags, val]);
    }
    input.value = "";
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitTagInput(e.currentTarget);
    }
  };

  // Flush any typed-but-not-committed tag when the input loses focus (e.g. user
  // clicks the Upload button without pressing Enter).
  const handleTagBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    commitTagInput(e.currentTarget);
  };

  const removeTag = (tag: string) => {
    onTagsChange(tags.filter((t) => t !== tag));
  };

  // ── Metadata handling ──────────────────────────────────────────────────────

  const addMetadataRow = () => {
    onMetadataChange([...metadataEntries, { key: "", value: "" }]);
  };

  const updateMetadataEntry = (
    index: number,
    field: "key" | "value",
    value: string,
  ) => {
    const updated = metadataEntries.map((entry, i) =>
      i === index ? { ...entry, [field]: value } : entry,
    );
    onMetadataChange(updated);
  };

  const removeMetadataEntry = (index: number) => {
    onMetadataChange(metadataEntries.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Upload mode */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Upload mode
        </Label>
        <RadioGroup
          value={uploadMode}
          onValueChange={(v) => onUploadModeChange(v as UploadMode)}
          disabled={disabled}
          className="gap-2"
        >
          <label className="flex items-start gap-2.5 cursor-pointer rounded-md border p-3 hover:bg-muted/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
            <RadioGroupItem value="presigned" id="mode-presigned" className="mt-0.5" />
            <div>
              <p className="text-sm font-medium leading-none">Presigned URL</p>
              <p className="text-xs text-muted-foreground mt-1">
                Browser uploads directly to S3 — faster, shows per-file progress.
              </p>
            </div>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer rounded-md border p-3 hover:bg-muted/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
            <RadioGroupItem value="server" id="mode-server" className="mt-0.5" />
            <div>
              <p className="text-sm font-medium leading-none">Server-side</p>
              <p className="text-xs text-muted-foreground mt-1">
                Bytes route through the console server — useful for testing
                validation and pipeline triggers.
              </p>
            </div>
          </label>
        </RadioGroup>
      </div>

      {/* Folder */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Folder
        </Label>
        <FolderPickerPopover
          folders={folders}
          value={folderId}
          onChange={onFolderChange}
          disabled={disabled}
        />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tags
        </Label>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="gap-1 pr-1 text-xs"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  disabled={disabled}
                  className="rounded-sm opacity-60 hover:opacity-100 focus-visible:outline-none"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <Input
          placeholder="Type a tag and press Enter"
          onKeyDown={handleTagKeyDown}
          onBlur={handleTagBlur}
          disabled={disabled}
          className="h-8 text-sm"
        />
        <p className="text-xs text-muted-foreground">Press Enter or comma to add</p>
      </div>

      {/* Metadata */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Metadata
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-xs"
            onClick={addMetadataRow}
            disabled={disabled}
          >
            <Plus className="h-3 w-3" />
            Add field
          </Button>
        </div>

        {metadataEntries.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No metadata fields. Click &ldquo;Add field&rdquo; to attach key–value data.
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          {metadataEntries.map((entry, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <Input
                placeholder="Key"
                value={entry.key}
                onChange={(e) => updateMetadataEntry(index, "key", e.target.value)}
                disabled={disabled}
                className="h-8 text-sm flex-1"
              />
              <Input
                placeholder="Value"
                value={entry.value}
                onChange={(e) =>
                  updateMetadataEntry(index, "value", e.target.value)
                }
                disabled={disabled}
                className="h-8 text-sm flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeMetadataEntry(index)}
                disabled={disabled}
                aria-label="Remove metadata field"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
