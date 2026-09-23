/**
 * FileStagingPanel — shared multi-file staging + upload UI for doctor uploads.
 *
 * Layer: client / telemedicine / doctor / modals / clinical-records
 *
 * The doctor picks files, reviews the list, then clicks Upload. Files go to
 * FileNest one at a time; when the whole batch has settled the panel hands the
 * completed FileRecords to its parent, which decides what FHIR records to write.
 *
 * Extracted so UploadOrderResultModal (DiagnosticReport + DocumentReference)
 * and UploadEncounterDocumentModal (DocumentReference only) share one staging
 * implementation instead of duplicating it. Mechanics mirror the patient-side
 * UploadResultModal, which is the proven version of this flow.
 *
 * Must be rendered inside a FileNestProvider — useUpload requires it.
 */

"use client";

import { useCallback, useRef, useState } from "react";
import { useUpload, type FileRecord } from "@filenest-fs/react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
/* Shared with AttachmentList so a file is labelled the same way while it is
   being staged as it will be once it is on the record. */
import {
  fileExtension,
  formatBytes,
} from "@/modules/client/telemedicine/shared/components/clinical/AttachmentList";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Lifecycle status of a file in the staging list. */
type FileStatus = "staged" | "uploading" | "done" | "error";

/** A locally staged file plus its current upload status. */
interface StagedEntry {
  /** Unique id — avoids key collisions for same-named files across batches. */
  id: string;
  file: File;
  status: FileStatus;
}

interface FileStagingPanelProps {
  /**
   * Called once per batch, after every file has settled, with the records that
   * uploaded successfully. Write your FHIR records here.
   *
   * @param records - Successfully uploaded FileNest records.
   */
  onBatchComplete: (records: FileRecord[]) => Promise<void>;
  /** True while the parent is writing FHIR records — disables further input. */
  isSaving: boolean;
  /** Hint text shown on the right of the add-files button. */
  hint?: string;
}

// ── FileRow ───────────────────────────────────────────────────────────────────

/**
 * One row in the staging list: extension badge, filename, size, status icon.
 *
 * @param entry - Staged file entry with current status.
 * @param onRemove - Called when × is clicked (staged entries only).
 */
function FileRow({
  entry,
  onRemove,
}: {
  entry: StagedEntry;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2.5">
      <Badge
        variant="secondary"
        className="text-[10px] font-mono shrink-0 min-w-13 justify-center"
      >
        {fileExtension(entry.file.name, entry.file.type)}
      </Badge>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate leading-tight">
          {entry.file.name}
        </p>
        {entry.file.size > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatBytes(entry.file.size)}
          </p>
        )}
      </div>

      {entry.status === "staged" && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
          aria-label={`Remove ${entry.file.name}`}
        >
          <X className="size-4" />
        </button>
      )}
      {entry.status === "uploading" && (
        <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />
      )}
      {entry.status === "done" && (
        <CheckCircle2 className="size-4 text-green-500 dark:text-green-400 shrink-0" />
      )}
      {entry.status === "error" && (
        <AlertCircle className="size-4 text-destructive shrink-0" />
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Multi-file staging list with an Upload action.
 *
 * @param onBatchComplete - Called with the successful records once a batch settles.
 * @param isSaving - Whether the parent is currently writing FHIR records.
 * @param hint - Optional hint text beside the add-files button.
 */
export function FileStagingPanel({
  onBatchComplete,
  isSaving,
  hint = "Any type · max 50 MB each",
}: FileStagingPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stagedFiles, setStagedFiles] = useState<StagedEntry[]>([]);

  /* Batch coordination — onComplete/onError fire once per file, so we count
     them down to know when the whole batch has settled. */
  const completedRecordsRef = useRef<FileRecord[]>([]);
  const uploadTotalRef = useRef(0);
  const uploadSettledRef = useRef(0);

  /** Clears the staging list once its batch has been written to FHIR. */
  const finishBatch = useCallback(async () => {
    const records = completedRecordsRef.current;
    if (records.length > 0) {
      await onBatchComplete(records);
      setStagedFiles([]);
      completedRecordsRef.current = [];
    }
  }, [onBatchComplete]);

  /** Called by useUpload once per successfully uploaded file. */
  const handleComplete = useCallback(
    async (fileRecord: FileRecord) => {
      completedRecordsRef.current.push(fileRecord);
      uploadSettledRef.current++;

      if (uploadSettledRef.current === uploadTotalRef.current) {
        setStagedFiles((prev) =>
          prev.map((f) => (f.status === "uploading" ? { ...f, status: "done" } : f)),
        );
        await finishBatch();
      }
    },
    [finishBatch],
  );

  /**
   * Called by useUpload when a file fails. Marks one uploading entry as errored;
   * if the rest of the batch succeeded, those files are still written to FHIR.
   */
  const handleError = useCallback(
    async (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
      uploadSettledRef.current++;

      setStagedFiles((prev) => {
        let marked = false;
        return prev.map((f) => {
          if (!marked && f.status === "uploading") {
            marked = true;
            return { ...f, status: "error" };
          }
          return f;
        });
      });

      if (uploadSettledRef.current === uploadTotalRef.current) {
        await finishBatch();
      }
    },
    [finishBatch],
  );

  const { upload, isUploading } = useUpload({
    onComplete: handleComplete,
    onError: handleError,
  });

  /** Appends newly selected files to the staging list. */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    /* Reset the input so re-selecting the same file still fires a change. */
    e.target.value = "";
    setStagedFiles((prev) => [
      ...prev,
      ...files.map((f, i) => ({
        id: `${Date.now()}-${i}-${f.name}`,
        file: f,
        status: "staged" as FileStatus,
      })),
    ]);
  };

  /** Starts uploading everything currently staged. */
  const handleUploadClick = () => {
    const toUpload = stagedFiles.filter((f) => f.status === "staged");
    if (!toUpload.length) return;

    completedRecordsRef.current = [];
    uploadTotalRef.current = toUpload.length;
    uploadSettledRef.current = 0;

    setStagedFiles((prev) =>
      prev.map((f) => (f.status === "staged" ? { ...f, status: "uploading" } : f)),
    );
    upload(toUpload.map((e) => e.file));
  };

  const stagedCount = stagedFiles.filter((f) => f.status === "staged").length;
  const isBusy = isUploading || isSaving;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Upload New Files
      </p>

      {/* Add-files trigger */}
      <button
        type="button"
        onClick={() => !isBusy && inputRef.current?.click()}
        disabled={isBusy}
        className="w-full flex items-center gap-2.5 rounded-md border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:border-border hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Select files to stage"
      >
        <Plus className="size-4 shrink-0" />
        <span>Add files</span>
        <span className="ml-auto text-xs opacity-50">{hint}</span>
      </button>

      {/* Staged / uploading list */}
      {stagedFiles.length > 0 && (
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
          {stagedFiles.map((entry) => (
            <FileRow
              key={entry.id}
              entry={entry}
              onRemove={
                entry.status === "staged"
                  ? () =>
                      setStagedFiles((prev) => prev.filter((f) => f.id !== entry.id))
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {stagedFiles.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <FileText className="size-8 opacity-40" />
          <p className="text-sm">No files staged.</p>
          <p className="text-xs opacity-60">Add files above, then click Upload.</p>
        </div>
      )}

      {/* Upload action */}
      {stagedCount > 0 && !isBusy && (
        <Button type="button" onClick={handleUploadClick} className="w-full gap-2">
          <Upload className="size-4" />
          Upload {stagedCount} file{stagedCount > 1 ? "s" : ""}
        </Button>
      )}

      {isSaving && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Saving to medical records…
        </div>
      )}

      {/* Hidden multi-file input — no type restriction beyond FileNest's own */}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  );
}

// ── Shared FileNest config ────────────────────────────────────────────────────

/**
 * MIME types accepted for clinical uploads.
 *
 * Deliberately broad: covers office documents, scans and photos, plus the
 * clinical interchange formats a hospital or lab may hand over (DICOM, HL7 v2/v3,
 * CDA, FHIR bundles). Mirrors the patient-side allow-list so both sides of the
 * product accept the same files.
 */
export const CLINICAL_UPLOAD_MIME_TYPES = [
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/rtf",
  // Images (scanned reports, photos of results)
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
  // Archives
  "application/zip",
  "application/x-zip-compressed",
  // Medical / clinical standards
  "application/dicom",
  "application/octet-stream",
  "text/hl7v2",
  "application/hl7-v2+er7",
  "application/hl7-v3+xml",
  "text/xml",
  "application/xml",
  "application/fhir+json",
  "application/fhir+xml",
  "application/json",
];

/**
 * Reads sizeBytes from a FileRecord.
 * The FileNest SDK's final record fetch uses raw fetch, so runtime keys are
 * snake_case despite the TS type declaring camelCase.
 *
 * @param record - Completed FileNest record.
 * @returns Size in bytes, or 0 when unavailable.
 */
export function getRecordSize(record: FileRecord): number {
  const raw = record as unknown as Record<string, unknown>;
  return (record.sizeBytes ?? raw["size_bytes"] ?? 0) as number;
}

/**
 * Reads contentType from a FileRecord (same snake_case caveat as getRecordSize).
 *
 * @param record - Completed FileNest record.
 * @returns MIME type, or an empty string when unavailable.
 */
export function getRecordContentType(record: FileRecord): string {
  const raw = record as unknown as Record<string, unknown>;
  return (record.contentType ?? raw["content_type"] ?? "") as string;
}
