/**
 * FileUpload — a2ui catalog component for binary file upload via FileNest.
 *
 * Layer: client / ai-hub / a2ui / catalog
 *
 * Renders a click-to-upload / drag-and-drop zone. On completion it writes a
 * `data-json="true"` hidden input with id={component.id} so the parent Form's
 * collectFormData picks it up as a structured object:
 *   single file  → { fileId, filename, contentType, sizeBytes }
 *   multi-file   → [{ fileId, … }, …]
 *
 * Architecture:
 *   Outer component  — resolves JSON schema props, builds the tokenFetcher
 *                      callback, wraps children in <FileNestProvider>.
 *   Inner component  — rendered inside the provider; calls useUpload().
 *
 * The component uses tokenFetcher (not tokenEndpoint) so it can POST a fully-
 * resolved body: { allowedMimeTypes, maxSize, maxFiles, metadata }.  This lets
 * the server enforce per-field constraints and embed dynamic metadata (e.g. a
 * patientId resolved from the current data context) into every file record.
 *
 * Must be rendered inside the app's <QueryProvider>. The app's existing
 * QueryClient is shared with FileNestProvider via useQueryClient() to avoid
 * a duplicate provider in the tree.
 *
 * Image preview:
 *   After a successful upload, image files (contentType starting with "image/")
 *   show an eye icon in the file list. Clicking it opens a Dialog that previews
 *   the image directly from the local blob URL — no server round-trip needed.
 *   Object URLs are revoked when the file is removed or the component unmounts.
 */

"use client";

import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileNestProvider, useUpload } from "@filenest-fs/react";
import type { FileRecord } from "@filenest-fs/react";
import { Upload, File, X, Loader2, AlertCircle, Eye } from "lucide-react";

import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { FileUploadNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { useFileNestTokenFetcher } from "@/modules/client/shared/hooks/useFileNestTokenFetcher";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ── Shared types ──────────────────────────────────────────────────────────────

/** Shape of one completed upload, written to the hidden input. */
interface UploadedFile {
  fileId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  /**
   * Blob URL created from the local File object before upload.
   * Only present for image files; used for the in-UI preview dialog.
   * Must be revoked via URL.revokeObjectURL when no longer needed.
   */
  localObjectUrl?: string;
}

// ── Outer component ───────────────────────────────────────────────────────────

interface FileUploadProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: FileUploadNode;
  weight?: string | number;
}

/**
 * Resolves all JSON schema properties, builds the tokenFetcher, and wraps the
 * inner upload widget in a FileNestProvider.
 *
 * @param processor  - a2ui message processor for the current surface.
 * @param surfaceId  - ID of the surface this component belongs to.
 * @param component  - Resolved FileUploadNode from the JSON schema.
 * @param weight     - Flex weight passed from the parent container.
 */
export function FileUpload({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: FileUploadProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );
  const queryClient = useQueryClient();

  // ── Resolve scalar properties ─────────────────────────────────────────────

  const tokenEndpointBase = useMemo(
    () =>
      (resolvePrimitive(component.properties.tokenEndpoint) as string) ??
      "/api/filenest-token",
    [resolvePrimitive, component.properties.tokenEndpoint],
  );

  const label = useMemo(
    () => resolvePrimitive(component.properties.label) as string | undefined,
    [resolvePrimitive, component.properties.label],
  );

  const maxFiles = useMemo(
    () =>
      (resolvePrimitive(component.properties.maxFiles) as number | undefined) ??
      1,
    [resolvePrimitive, component.properties.maxFiles],
  );

  const maxSizeMb = useMemo(
    () =>
      (resolvePrimitive(
        component.properties.maxSizeMb,
      ) as number | undefined) ?? 5,
    [resolvePrimitive, component.properties.maxSizeMb],
  );

  const allowedMimeTypes: string[] =
    component.properties.allowedMimeTypes ?? [];

  // ── Resolve filePath — full nested folder path, e.g. "10000/servicerequest/xray" ─

  const resolvedFilePath = useMemo(
    () =>
      component.properties.filePath
        ? (resolvePrimitive(component.properties.filePath) as string | undefined)
        : undefined,
    [resolvePrimitive, component.properties.filePath],
  );

  // ── Resolve metadata — each value may be a literal or a $variable path ───

  const resolvedMetadata = useMemo(() => {
    const raw = component.properties.metadata;
    if (!raw) return {};
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(raw)) {
      out[key] = resolvePrimitive(val);
    }
    return out;
  }, [resolvePrimitive, component.properties.metadata]);

  // ── Resolve userId / orgId — override the session-derived values on the server ─

  const resolvedUserId = useMemo(
    () =>
      component.properties.userId
        ? (resolvePrimitive(component.properties.userId) as string | undefined)
        : undefined,
    [resolvePrimitive, component.properties.userId],
  );

  const resolvedOrgId = useMemo(
    () =>
      component.properties.orgId
        ? (resolvePrimitive(component.properties.orgId) as string | undefined)
        : undefined,
    [resolvePrimitive, component.properties.orgId],
  );

  // ── tokenFetcher — posts full body so the route enforces these constraints ─

  const tokenFetcher = useFileNestTokenFetcher({
    endpoint: tokenEndpointBase,
    filePath: resolvedFilePath,
    allowedMimeTypes: allowedMimeTypes.length > 0
      ? allowedMimeTypes
      : ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxSizeMb,
    maxFiles,
    metadata: resolvedMetadata,
    userId: resolvedUserId,
    orgId: resolvedOrgId,
  });

  // ── Render ────────────────────────────────────────────────────────────────

  const acceptAttr =
    allowedMimeTypes.length > 0 ? allowedMimeTypes.join(",") : "image/*";
  const multiple = maxFiles > 1;

  const autoUpload = component.properties.autoUpload !== false;

  return (
    <FileNestProvider
      projectId={process.env.NEXT_PUBLIC_FILENEST_PROJECT_ID!}
      baseUrl={process.env.NEXT_PUBLIC_FILENEST_API_URL}
      tokenFetcher={tokenFetcher}
      queryClient={queryClient}
    >
      <FileUploadInner
        componentId={component.id}
        label={label}
        acceptAttr={acceptAttr}
        allowedMimeTypes={allowedMimeTypes}
        maxFiles={maxFiles}
        multiple={multiple}
        autoUpload={autoUpload}
        weight={weight}
      />
    </FileNestProvider>
  );
}

// ── Inner component ───────────────────────────────────────────────────────────

interface FileUploadInnerProps {
  componentId: string;
  label?: string;
  acceptAttr: string;
  allowedMimeTypes: string[];
  maxFiles: number;
  multiple: boolean;
  /** When false, files are staged until the user clicks the Upload button. */
  autoUpload: boolean;
  weight: string | number;
}

/**
 * Upload widget rendered inside FileNestProvider. Manages selection, progress,
 * file list state, and the hidden input that the parent Form's collectFormData
 * reads on submit.
 *
 * @param componentId      - Component ID used as the hidden input's id.
 * @param label            - Optional label above the drop zone.
 * @param acceptAttr       - <input accept> value derived from allowedMimeTypes.
 * @param allowedMimeTypes - Array of MIME types shown in the hint text.
 * @param maxFiles         - How many files the user can upload (controls "add more" visibility).
 * @param multiple         - Whether the file input accepts multiple files at once.
 * @param weight           - CSS flex weight for the outer container.
 */
function FileUploadInner({
  componentId,
  label,
  acceptAttr,
  allowedMimeTypes,
  maxFiles,
  multiple,
  autoUpload,
  weight,
}: FileUploadInnerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  /** Files selected but not yet uploaded — only populated when autoUpload is false. */
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  /**
   * Map of filename → blob URL for local image preview.
   * Populated in handleFiles before upload starts so the URL is available
   * as soon as the upload completes and handleComplete fires.
   */
  const pendingPreviewUrls = useRef<Record<string, string>>({});

  /** File currently shown in the preview dialog; null when dialog is closed. */
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);

  // Revoke all remaining blob URLs on unmount to release memory.
  useEffect(() => {
    return () => {
      for (const url of Object.values(pendingPreviewUrls.current)) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  // ── Hidden input value ────────────────────────────────────────────────────

  /**
   * JSON value written to the hidden input.
   * Single-file mode → plain object; multi-file mode → array.
   * localObjectUrl is excluded — it's browser-only and not sent to the server.
   * Empty string when nothing has been uploaded yet — Form ignores empty keys.
   */
  const hiddenInputValue = useMemo(() => {
    if (uploadedFiles.length === 0) return "";
    const toSerialise = (f: UploadedFile) => ({
      fileId: f.fileId,
      filename: f.filename,
      contentType: f.contentType,
      sizeBytes: f.sizeBytes,
    });
    const data =
      maxFiles === 1 ? toSerialise(uploadedFiles[0]) : uploadedFiles.map(toSerialise);
    return JSON.stringify(data);
  }, [uploadedFiles, maxFiles]);

  // ── Upload callbacks ──────────────────────────────────────────────────────

  /**
   * Called by useUpload when a file upload completes successfully.
   * The React SDK's callApi uses raw fetch without camelization, so runtime
   * FileRecord keys are snake_case despite the TypeScript type saying camelCase.
   * We fall back to snake_case keys to be safe.
   *
   * @param fileRecord - Completed FileRecord from the FileNest SDK.
   */
  const handleComplete = useCallback(
    (fileRecord: FileRecord) => {
      setError(null);
      const raw = fileRecord as unknown as Record<string, unknown>;
      const contentType = (fileRecord.contentType ??
        raw["content_type"] ??
        "") as string;
      const sizeBytes = (fileRecord.sizeBytes ??
        raw["size_bytes"] ??
        0) as number;

      // Attach the blob URL created in handleFiles (images only).
      const localObjectUrl = pendingPreviewUrls.current[fileRecord.filename];
      // Remove from the pending map so unmount cleanup doesn't double-revoke.
      delete pendingPreviewUrls.current[fileRecord.filename];

      const uploaded: UploadedFile = {
        fileId: fileRecord.id,
        filename: fileRecord.filename,
        contentType,
        sizeBytes,
        localObjectUrl,
      };

      setUploadedFiles((prev) =>
        maxFiles === 1
          ? [uploaded]
          : [...prev, uploaded].slice(0, maxFiles),
      );
    },
    [maxFiles],
  );

  /**
   * Called by useUpload when an upload fails.
   *
   * @param err - Error thrown by the SDK.
   */
  const handleError = useCallback((err: Error) => {
    setError(err.message);
  }, []);

  const { upload, isUploading, uploads } = useUpload({
    onComplete: handleComplete,
    onError: handleError,
  });

  // ── File selection ────────────────────────────────────────────────────────

  const handleFiles = useCallback(
    (files: File[]) => {
      if (!files.length) return;
      setError(null);
      const chosen =
        maxFiles === 1 ? [files[0]] : files.slice(0, maxFiles);

      if (autoUpload) {
        // Auto-upload: create preview URLs and upload immediately.
        for (const file of chosen) {
          if (file.type.startsWith("image/")) {
            pendingPreviewUrls.current[file.name] = URL.createObjectURL(file);
          }
        }
        upload(chosen);
      } else {
        // Manual upload: stage the files — upload fires when the user clicks the button.
        setPendingFiles((prev) =>
          maxFiles === 1 ? chosen : [...prev, ...chosen].slice(0, maxFiles),
        );
      }
    },
    [upload, maxFiles, autoUpload],
  );

  /**
   * Removes a file from the pending (not-yet-uploaded) staging list.
   *
   * @param index - Index of the file to remove from pendingFiles.
   */
  const removePendingFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Uploads all staged pending files. Called when the user clicks the Upload button.
   * Creates preview URLs just before upload so handleComplete can attach them.
   */
  const uploadPending = useCallback(() => {
    if (!pendingFiles.length) return;
    for (const file of pendingFiles) {
      if (file.type.startsWith("image/")) {
        pendingPreviewUrls.current[file.name] = URL.createObjectURL(file);
      }
    }
    upload(pendingFiles);
    setPendingFiles([]);
  }, [pendingFiles, upload]);

  /** Triggered by the hidden file input. Resets the input so the same file can be re-selected. */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    handleFiles(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  /**
   * Opens the preview dialog for a pending (not-yet-uploaded) file by creating
   * a temporary blob URL. The URL is revoked when the dialog closes.
   *
   * @param file - The staged File object to preview.
   */
  const previewPendingFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewFile({
      fileId:         `__pending__${file.name}`,
      filename:       file.name,
      contentType:    file.type,
      sizeBytes:      file.size,
      localObjectUrl: url,
    });
  }, []);

  /**
   * Removes a file from the list and revokes its blob URL to free memory.
   *
   * @param fileId - FileNest file ID of the entry to remove.
   */
  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => {
      const target = prev.find((f) => f.fileId === fileId);
      if (target?.localObjectUrl) URL.revokeObjectURL(target.localObjectUrl);
      return prev.filter((f) => f.fileId !== fileId);
    });
    // Close preview dialog if the file being previewed is removed.
    setPreviewFile((prev) => (prev?.fileId === fileId ? null : prev));
  };

  // ── Derived UI values ─────────────────────────────────────────────────────

  const activeUpload = uploads.find((u) => u.status === "uploading");
  const uploadProgress = activeUpload?.progress ?? 0;

  // Human-readable hint line, e.g. "JPEG, PNG, WEBP"
  const hint =
    allowedMimeTypes.length > 0
      ? allowedMimeTypes
          .map((m) => m.split("/")[1]?.toUpperCase() ?? m)
          .join(", ")
      : "Any file type";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2 w-full" style={{ flex: weight }}>
      {/* Label */}
      {label && (
        <Label className="text-sm font-medium text-foreground">{label}</Label>
      )}

      {/* Hidden input — id matches component.id so Form.collectFormData picks it up */}
      <input
        type="hidden"
        id={componentId}
        data-json="true"
        value={hiddenInputValue}
        onChange={() => {}} // controlled; value is updated via state, not user input
      />

      {/* Drop zone — hidden once max files are reached, an upload is in progress, or files are staged */}
      {uploadedFiles.length + pendingFiles.length < maxFiles && !isUploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={[
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5 text-primary"
              : "border-border text-muted-foreground hover:border-primary/50 hover:bg-muted/30",
          ].join(" ")}
        >
          <Upload className="size-6" />
          <span className="text-sm font-medium">
            {multiple ? "Click or drop files here" : "Click or drop a file here"}
          </span>
          <span className="text-xs">{hint}</span>
        </button>
      )}

      {/* Upload progress bar */}
      {isUploading && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <Loader2 className="size-4 animate-spin text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {activeUpload?.filename ?? "Uploading…"}
            </p>
            <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {uploadProgress}%
          </span>
        </div>
      )}

      {/* Staging list + upload button — only shown in manual mode when files are pending */}
      {!autoUpload && pendingFiles.length > 0 && (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-col gap-2">
            {pendingFiles.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/10 px-3 py-2"
              >
                <div className="size-8 rounded bg-muted flex items-center justify-center shrink-0">
                  <File className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.type} · {(file.size / 1024).toFixed(1)} KB · Pending
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {file.type.startsWith("image/") && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => previewPendingFile(file)}
                          aria-label={`Preview ${file.name}`}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Preview</TooltipContent>
                    </Tooltip>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removePendingFile(index)}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={uploadPending}
            disabled={isUploading}
            className="w-full"
          >
            <Upload className="size-4 mr-2" />
            {pendingFiles.length === 1
              ? "Upload file"
              : `Upload ${pendingFiles.length} files`}
          </Button>
        </div>
      )}

      {/* Uploaded file list */}
      {uploadedFiles.length > 0 && (
        <ul className="flex flex-col gap-2">
          {uploadedFiles.map((f) => (
            <li
              key={f.fileId}
              className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2"
            >
              <div className="size-8 rounded bg-muted flex items-center justify-center shrink-0">
                <File className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {f.filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {f.contentType} · {(f.sizeBytes / 1024).toFixed(1)} KB
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Preview — only for images that have a local blob URL */}
                {f.localObjectUrl && f.contentType.startsWith("image/") && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setPreviewFile(f)}
                        aria-label={`Preview ${f.filename}`}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Preview</TooltipContent>
                  </Tooltip>
                )}

                {/* Remove */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeFile(f.fileId)}
                  aria-label={`Remove ${f.filename}`}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* Hidden file input — sr-only, triggered by the drop zone button */}
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        multiple={multiple}
        className="sr-only"
        onChange={handleInputChange}
      />

      {/* Image preview dialog */}
      <Dialog
        open={previewFile !== null}
        onOpenChange={(open) => {
          if (!open) {
            // Revoke blob URLs created on-demand for pending file previews.
            if (previewFile?.fileId.startsWith("__pending__") && previewFile.localObjectUrl) {
              URL.revokeObjectURL(previewFile.localObjectUrl);
            }
            setPreviewFile(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="truncate text-sm font-medium">
              {previewFile?.filename}
            </DialogTitle>
          </DialogHeader>
          {previewFile?.localObjectUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewFile.localObjectUrl}
              alt={previewFile.filename}
              className="w-full rounded-md object-contain max-h-[60vh]"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
