/**
 * FileUploadModal — full-featured file upload dialog.
 *
 * Orchestrates the entire upload flow for the Files page:
 *   - Drag-and-drop / click-to-browse via FileDropzone (react-dropzone)
 *   - Per-file upload state tracked by useFileUpload
 *   - Upload mode selection (presigned URL vs server-side) via UploadConfigPanel
 *   - Folder assignment, tag input, and metadata key–value builder
 *
 * Auto-detection:
 *   Files < 5 MB  → single presigned URL PUT + confirm
 *   Files >= 5 MB → multipart (5 MB chunks, sequential part uploads)
 *
 * After all uploads complete the trigger counter increments so FilesTable
 * invalidates its query and refetches.
 *
 * @module
 */
"use client";

import { useState, useEffect } from "react";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileDropzone } from "./FileDropzone";
import { FileUploadList } from "./FileUploadList";
import {
  UploadConfigPanel,
  type UploadMode,
  type MetadataEntry,
} from "./UploadConfigPanel";
import { useFileUpload } from "@/modules/client/files/hooks/useFileUpload";
import { useFileStore } from "@/modules/client/files/stores/file.store";
import type { TFolderList } from "@/modules/entities/schemas/folder";
import type { TProjectConfig } from "@/modules/entities/schemas/project-config";

interface FileUploadModalProps {
  projectId: string;
  folders: TFolderList;
  /** Project configuration fetched server-side — drives dropzone constraints. */
  projectConfig: TProjectConfig | null;
}

export function FileUploadModal({ projectId, folders, projectConfig }: FileUploadModalProps) {
  // Derive upload constraints from project config (null = no restriction)
  const acceptedTypes = projectConfig?.allowed_mime_types ?? undefined;
  const maxSizeBytes = projectConfig?.max_file_size_bytes ?? undefined;
  const maxFiles = projectConfig?.max_files_per_request ?? undefined;
  const virusScanEnabled = projectConfig?.virus_scan_enabled ?? false;
  const { isOpen, modalType, onClose, incrementTrigger } = useFileStore();

  const open = isOpen && modalType === "uploadFile";

  // ── Upload hook ───────────────────────────────────────────────────────────
  const {
    items,
    addFiles,
    removeFile,
    clearAll,
    startUpload,
    isUploading,
    allDone,
    hasQueued,
  } = useFileUpload();

  // ── Config state ──────────────────────────────────────────────────────────
  const [uploadMode, setUploadMode] = useState<UploadMode>("presigned");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [metadataEntries, setMetadataEntries] = useState<MetadataEntry[]>([]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      clearAll();
      setUploadMode("presigned");
      setFolderId(null);
      setTags([]);
      setMetadataEntries([]);
    }
  }, [open, clearAll]);

  // Auto-close and refresh table after all uploads finish
  useEffect(() => {
    if (allDone) {
      const hasSuccess = items.some((i) => i.status === "done");
      if (hasSuccess) {
        incrementTrigger();
      }
    }
  }, [allDone, items, incrementTrigger]);

  const handleUpload = async () => {
    const metadata = Object.fromEntries(
      metadataEntries
        .filter((e) => e.key.trim())
        .map((e) => [e.key.trim(), e.value]),
    );

    await startUpload({
      projectId,
      uploadMode,
      folderId,
      tags,
      metadata,
    });
  };

  const handleClose = () => {
    if (isUploading) return; // don't allow closing mid-upload
    onClose();
  };

  const queuedCount = items.filter((i) => i.status === "queued").length;
  const canUpload = hasQueued && !isUploading;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      {/*
        p-0 + gap-0 overrides the DialogContent defaults (p-4, gap-4, grid).
        flex flex-col lets header / body / footer stack with proper flex sizing.
      */}
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload files
          </DialogTitle>
          <DialogDescription>
            Files are uploaded directly to your configured storage provider. Tags,
            metadata, and folder assignments are applied immediately.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {/*
          Body — mobile: single column, parent scrolls.
          md+: two columns side by side, each panel scrolls independently.
        */}
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto md:flex-row md:overflow-hidden">
          {/* Left: dropzone + file list */}
          <div className="flex flex-col gap-4 p-4 sm:p-6 border-b md:border-b-0 md:border-r md:flex-1 md:min-w-0 md:overflow-y-auto">
            <FileDropzone
              onFilesSelected={addFiles}
              acceptedTypes={acceptedTypes}
              maxSizeBytes={maxSizeBytes}
              maxFiles={maxFiles}
              disabled={isUploading}
            />

            {virusScanEnabled && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                Virus scan is enabled — files will be quarantined if a threat is detected.
              </p>
            )}

            <FileUploadList items={items} onRemove={removeFile} />

            {allDone && (
              <p className="text-sm text-center text-muted-foreground py-2">
                Upload complete. You can close this dialog or add more files.
              </p>
            )}
          </div>

          {/* Right: config panel — full width on mobile, fixed sidebar on desktop */}
          <div className="p-4 sm:p-6 md:w-72 md:shrink-0 md:overflow-y-auto">
            <UploadConfigPanel
              uploadMode={uploadMode}
              onUploadModeChange={setUploadMode}
              folderId={folderId}
              onFolderChange={setFolderId}
              folders={folders}
              tags={tags}
              onTagsChange={setTags}
              metadataEntries={metadataEntries}
              onMetadataChange={setMetadataEntries}
              disabled={isUploading}
            />
          </div>
        </div>

        {/*
          Footer — stacks buttons vertically on mobile (cancel below upload),
          rows them on sm+ and aligns right.
        */}
        <div className="flex flex-col-reverse gap-2 px-4 py-4 shrink-0 border-t bg-muted/50 rounded-b-xl sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
            className="w-full sm:w-auto"
          >
            {allDone ? "Close" : "Cancel"}
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!canUpload}
            className="w-full sm:w-auto"
          >
            {isUploading
              ? "Uploading…"
              : `Upload${queuedCount > 0 ? ` ${queuedCount} file${queuedCount !== 1 ? "s" : ""}` : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
