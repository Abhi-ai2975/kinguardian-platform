/**
 * @filenest/react hooks/useUpload — programmatic upload with per-file progress state.
 * @module
 */

import { useCallback, useState } from "react";
import type { FileRecord, UploadProgress } from "@filenest/core";
import { useFileNest } from "../context/FileNestContext.js";

export type UploadStatus = "pending" | "uploading" | "success" | "failed";

export interface UploadState {
  id: string;
  filename: string;
  status: UploadStatus;
  progress: number;
  file: FileRecord | null;
  error: Error | null;
}

export interface UseUploadOptions {
  folderId?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  onComplete?: (file: FileRecord) => void;
  onError?: (error: Error, filename: string) => void;
}

export function useUpload(options: UseUploadOptions = {}) {
  const { upload: contextUpload } = useFileNest();
  const [uploads, setUploads] = useState<UploadState[]>([]);

  const updateUpload = (id: string, patch: Partial<UploadState>) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  const upload = useCallback(
    async (files: File[]): Promise<void> => {
      const newUploads: UploadState[] = files.map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        filename: f.name,
        status: "pending",
        progress: 0,
        file: null,
        error: null,
      }));
      setUploads((prev) => [...prev, ...newUploads]);

      await Promise.allSettled(
        newUploads.map(async (state, i) => {
          updateUpload(state.id, { status: "uploading" });
          try {
            const file = await contextUpload(files[i], {
              folderId: options.folderId,
              metadata: options.metadata,
              tags: options.tags,
              onProgress: (p: UploadProgress) => updateUpload(state.id, { progress: p.percentage }),
            });
            updateUpload(state.id, { status: "success", progress: 100, file });
            options.onComplete?.(file);
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            updateUpload(state.id, { status: "failed", error });
            options.onError?.(error, state.filename);
          }
        })
      );
    },
    [contextUpload, options]
  );

  const cancel = useCallback((id: string) => {
    // XHR abort not yet wired — mark as failed
    updateUpload(id, { status: "failed", error: new Error("Cancelled") });
  }, []);

  const retry = useCallback(
    async (id: string) => {
      const state = uploads.find((u) => u.id === id);
      if (!state) return;
      updateUpload(id, { status: "pending", progress: 0, error: null });
    },
    [uploads]
  );

  const clear = useCallback(() => setUploads([]), []);

  return {
    upload,
    uploads,
    isUploading: uploads.some((u) => u.status === "uploading"),
    cancel,
    retry,
    clear,
  };
}
