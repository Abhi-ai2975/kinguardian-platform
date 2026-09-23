/**
 * @filenest/react components/FileUpload — drag-and-drop and button file upload component.
 *
 * Fetches an upload token from the host app's token endpoint via `FileNestProvider`,
 * then uploads files with progress reporting. Supports dropzone, button, and minimal variants.
 *
 * @module
 */

import React, { useCallback, useRef, useState } from "react";
import type { FileRecord } from "@filenest/core";
import { useUpload, type UploadState } from "../hooks/useUpload.js";

type UploadVariant = "dropzone" | "button" | "minimal";

export interface MetadataFormField {
  name: string;
  label: string;
  type: "text" | "select" | "textarea";
  options?: string[];
  required?: boolean;
}

export interface FileUploadProps {
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
  multiple?: boolean;
  folderId?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  metadataForm?: { fields: MetadataFormField[] };
  variant?: UploadVariant;
  placeholder?: string;
  showProgress?: boolean;
  showPreview?: boolean;
  onUploadStart?: (files: File[]) => void;
  onProgress?: (file: File, percentage: number) => void;
  onComplete?: (files: FileRecord[]) => void;
  onError?: (error: Error, filename: string) => void;
  onValidationError?: (errors: { message: string }[]) => void;
  className?: string;
}

export function FileUpload({
  accept,
  maxSize,
  maxFiles = 10,
  multiple = true,
  folderId,
  metadata,
  tags,
  variant = "dropzone",
  placeholder = "Drag and drop files here, or click to browse",
  showProgress = true,
  onUploadStart,
  onComplete,
  onError,
  onValidationError,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { upload, uploads, isUploading } = useUpload({
    folderId,
    metadata,
    tags,
    onComplete: (file) => {
      const allDone = uploads.filter((u) => u.status === "success").length + 1 === uploads.length;
      if (allDone) {
        const completed = uploads
          .filter((u) => u.status === "success" && u.file)
          .map((u) => u.file as FileRecord);
        onComplete?.([...completed, file]);
      }
    },
    onError,
  });

  const validate = (files: File[]): { valid: File[]; errors: { message: string }[] } => {
    const errors: { message: string }[] = [];
    const valid = files.filter((f) => {
      if (maxSize && f.size > maxSize) {
        errors.push({ message: `${f.name} exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)} MB` });
        return false;
      }
      if (accept && accept.length > 0) {
        const matches = accept.some((a) => {
          if (a.endsWith("/*")) return f.type.startsWith(a.replace("/*", "/"));
          return f.type === a;
        });
        if (!matches) {
          errors.push({ message: `${f.name} has unsupported file type` });
          return false;
        }
      }
      return true;
    });
    return { valid, errors };
  };

  const handleFiles = useCallback(
    (files: File[]) => {
      const capped = files.slice(0, maxFiles);
      const { valid, errors } = validate(capped);
      if (errors.length) onValidationError?.(errors);
      if (!valid.length) return;
      onUploadStart?.(valid);
      upload(valid);
    },
    [upload, maxFiles, onUploadStart, onValidationError]
  );

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(Array.from(e.target.files));
  };

  const acceptAttr = accept?.join(",");

  if (variant === "button") {
    return (
      <div className={className}>
        <input ref={inputRef} type="file" accept={acceptAttr} multiple={multiple} onChange={onChange} style={{ display: "none" }} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={isUploading}>
          {isUploading ? "Uploading…" : "Upload files"}
        </button>
        {showProgress && <UploadProgressList uploads={uploads} />}
      </div>
    );
  }

  return (
    <div className={className}>
      <input ref={inputRef} type="file" accept={acceptAttr} multiple={multiple} onChange={onChange} style={{ display: "none" }} />
      <div
        role="button"
        tabIndex={0}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? "#3b82f6" : "#d1d5db"}`,
          borderRadius: 8,
          padding: 32,
          textAlign: "center",
          cursor: "pointer",
          background: isDragging ? "rgba(59,130,246,0.05)" : "transparent",
          transition: "all 0.15s ease",
        }}
        aria-label="File upload area"
      >
        <p style={{ margin: 0, color: "#6b7280" }}>{placeholder}</p>
        {accept && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9ca3af" }}>Accepted: {accept.join(", ")}</p>}
        {maxSize && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }}>Max size: {Math.round(maxSize / 1024 / 1024)} MB</p>}
      </div>
      {showProgress && <UploadProgressList uploads={uploads} />}
    </div>
  );
}

function UploadProgressList({ uploads }: { uploads: UploadState[] }) {
  if (!uploads.length) return null;
  return (
    <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
      {uploads.map((u) => (
        <li key={u.id} style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span>{u.filename}</span>
            <span style={{ color: u.status === "failed" ? "#ef4444" : u.status === "success" ? "#22c55e" : "#6b7280" }}>
              {u.status === "uploading" ? `${u.progress}%` : u.status}
            </span>
          </div>
          {u.status === "uploading" && (
            <div style={{ height: 4, background: "#e5e7eb", borderRadius: 2, overflow: "hidden", marginTop: 3 }}>
              <div style={{ height: "100%", width: `${u.progress}%`, background: "#3b82f6", transition: "width 0.1s" }} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
