/**
 * FileDropzone — drag-and-drop / click-to-browse file picker.
 *
 * Uses react-dropzone. Enforces the project's upload constraints:
 *   - acceptedTypes  → allowed MIME types (allowed_mime_types from project config)
 *   - maxSizeBytes   → per-file size limit (max_file_size_bytes)
 *   - maxFiles       → max files per upload batch (max_files_per_request)
 *
 * Rejected files (wrong type, too large, too many) are shown in an error list
 * below the drop area so the user knows why specific files were not accepted.
 *
 * Does not start uploads — it only collects accepted files and passes them
 * up via onFilesSelected so the parent can enqueue them.
 *
 * @module
 */
"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { UploadCloud, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  /**
   * MIME types to accept. If undefined or empty, all types are accepted.
   * Mirrors the project's allowed_mime_types setting.
   */
  acceptedTypes?: string[];
  /** Maximum individual file size in bytes (max_file_size_bytes from project config). */
  maxSizeBytes?: number;
  /** Maximum number of files per upload batch (max_files_per_request). */
  maxFiles?: number;
  disabled?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Map react-dropzone error codes to human-readable messages. */
function rejectionMessage(rejection: FileRejection, maxSizeBytes?: number): string {
  const codes = rejection.errors.map((e) => e.code);
  if (codes.includes("file-too-large")) {
    return `${rejection.file.name}: too large${maxSizeBytes ? ` (max ${formatBytes(maxSizeBytes)})` : ""}`;
  }
  if (codes.includes("file-invalid-type")) {
    return `${rejection.file.name}: file type not allowed`;
  }
  if (codes.includes("too-many-files")) {
    return `${rejection.file.name}: exceeds the per-upload file limit`;
  }
  return `${rejection.file.name}: ${rejection.errors[0]?.message ?? "rejected"}`;
}

export function FileDropzone({
  onFilesSelected,
  acceptedTypes,
  maxSizeBytes,
  maxFiles,
  disabled,
}: FileDropzoneProps) {
  const [rejections, setRejections] = useState<FileRejection[]>([]);

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      setRejections(rejected);
      if (accepted.length > 0) onFilesSelected(accepted);
    },
    [onFilesSelected],
  );

  // Convert string[] to react-dropzone's Accept dict: { "image/jpeg": [] }
  const accept =
    acceptedTypes && acceptedTypes.length > 0
      ? Object.fromEntries(acceptedTypes.map((type) => [type, []]))
      : undefined;

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize: maxSizeBytes,
    maxFiles,
    disabled,
    multiple: true,
  });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed",
          "p-8 text-center transition-colors cursor-pointer",
          isDragActive && !isDragReject && "border-primary bg-primary/5",
          isDragReject && "border-destructive bg-destructive/5",
          !isDragActive && "border-border hover:border-primary/50 hover:bg-muted/30",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <input {...getInputProps()} />
        <div
          className={cn(
            "rounded-full p-3 transition-colors",
            isDragActive && !isDragReject ? "bg-primary/10" : "bg-muted",
          )}
        >
          <UploadCloud
            className={cn(
              "h-6 w-6 transition-colors",
              isDragActive && !isDragReject ? "text-primary" : "text-muted-foreground",
            )}
          />
        </div>

        <div>
          {isDragReject ? (
            <p className="text-sm font-medium text-destructive">
              File type not supported
            </p>
          ) : isDragActive ? (
            <p className="text-sm font-medium text-primary">Release to add files</p>
          ) : (
            <>
              <p className="text-sm font-medium">
                Drop files here or{" "}
                <span className="text-primary">click to browse</span>
              </p>
              <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {acceptedTypes && acceptedTypes.length > 0 && (
                  <p>{acceptedTypes.join(", ")}</p>
                )}
                {maxSizeBytes && <p>Max {formatBytes(maxSizeBytes)} per file</p>}
                {maxFiles && <p>Up to {maxFiles} file{maxFiles !== 1 ? "s" : ""} at once</p>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Rejection errors — cleared on next drop */}
      {rejections.length > 0 && (
        <ul className="space-y-1">
          {rejections.map((r, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {rejectionMessage(r, maxSizeBytes)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
