/**
 * useFileUpload — core upload orchestration hook.
 *
 * Manages per-file state machines, auto-detects single vs multipart based on
 * file size, and drives XHR uploads with per-file progress reporting.
 *
 * Auto-detect thresholds:
 *   < MULTIPART_THRESHOLD  → single presigned URL PUT
 *   >= MULTIPART_THRESHOLD → multipart (CHUNK_SIZE per part, sequential parts)
 *
 * Upload modes (passed to startUpload):
 *   "presigned" — browser PUTs bytes directly to S3 via XHR (recommended)
 *   "server"    — browser POSTs to /api/upload; Next.js server proxies to S3
 *
 * XHR is used for presigned URL mode so we get granular progress events via
 * xhr.upload.onprogress. Server-side mode shows an indeterminate spinner.
 *
 * S3 CORS requirement: the bucket must expose the ETag response header
 * (ExposeHeaders: ["ETag"]) so multipart part ETags are accessible in XHR.
 *
 * @module
 */
"use client";

import { useState, useCallback, useRef } from "react";
import {
  initiateUploadAction,
  confirmUploadAction,
  initiateMultipartAction,
  getPartUrlAction,
  completeMultipartAction,
  abortMultipartAction,
} from "@/modules/server/presentation/actions/file.actions";

/** Files below this size use a single presigned URL PUT. >= uses multipart. */
const MULTIPART_THRESHOLD = 5 * 1024 * 1024; // 5 MB

/** Each multipart chunk is exactly this size (S3 minimum is 5 MB per part). */
const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB

export type UploadStatus =
  | "queued"      // waiting to start
  | "uploading"   // XHR transfer in progress
  | "confirming"  // bytes sent, waiting for backend confirm
  | "done"        // confirmed and ready
  | "error";      // failed

export interface UploadItem {
  /** Local UUID — used as React key and for store lookups. */
  id: string;
  file: File;
  status: UploadStatus;
  /** 0–100 for presigned URL mode; -1 = indeterminate (server-side mode). */
  progress: number;
  /** FileNest file_id — available after initiation succeeds. */
  fileId: string | null;
  /** S3 multipart upload_id — available when isMultipart and initiation succeeds. */
  uploadId: string | null;
  /** Human-readable error message set when status === "error". */
  error: string | null;
  /** True when file.size >= MULTIPART_THRESHOLD. */
  isMultipart: boolean;
}

export interface UploadConfig {
  projectId: string;
  uploadMode: "presigned" | "server";
  folderId?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/** PUT bytes to a presigned S3 URL via XHR, emitting progress events. */
function xhrPut(
  url: string,
  body: XMLHttpRequestBodyInit,
  contentType: string,
  onProgress: (pct: number) => void,
): Promise<{ etag: string | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      console.log("[upload] XHR PUT complete", {
        status: xhr.status,
        url: url.substring(0, 80) + "…",
        etag: xhr.getResponseHeader("ETag"),
        allHeaders: xhr.getAllResponseHeaders(),
      });
      if (xhr.status >= 200 && xhr.status < 300) {
        // Strip surrounding quotes that S3 includes in ETag values.
        const raw = xhr.getResponseHeader("ETag");
        const etag = raw ? raw.replace(/^"|"$/g, "") : null;
        resolve({ etag });
      } else {
        console.error("[upload] XHR PUT failed", { status: xhr.status, responseText: xhr.responseText });
        reject(new Error(`S3 PUT failed: ${xhr.status} — ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => {
      console.error("[upload] XHR network error", { url: url.substring(0, 80) + "…" });
      reject(new Error("Network error during S3 PUT"));
    };
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.send(body);
  });
}

export function useFileUpload() {
  const [items, setItems] = useState<UploadItem[]>([]);
  // Track active XHR refs per item id so we can abort on cancel.
  const xhrMapRef = useRef<Map<string, XMLHttpRequest>>(new Map());

  const updateItem = useCallback(
    (id: string, patch: Partial<UploadItem>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const addFiles = useCallback((files: File[]) => {
    const newItems: UploadItem[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "queued",
      progress: 0,
      fileId: null,
      uploadId: null,
      error: null,
      isMultipart: file.size >= MULTIPART_THRESHOLD,
    }));
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  // ── Presigned URL — single file ────────────────────────────────────────────

  const uploadSingle = async (item: UploadItem, config: UploadConfig) => {
    console.log("[upload:single] start", { name: item.file.name, size: item.file.size, type: item.file.type });
    try {
      updateItem(item.id, { status: "uploading", progress: 0 });

      const [init, initErr] = await initiateUploadAction({
        payload: {
          projectId: config.projectId,
          filename: item.file.name,
          content_type: item.file.type || "application/octet-stream",
          size_bytes: item.file.size,
          ...(config.folderId ? { folder_id: config.folderId } : {}),
          tags: config.tags ?? [],
          metadata: config.metadata ?? {},
        },
      });

      console.log("[upload:single] initiate response", { init, initErr });

      if (initErr || !init) {
        throw new Error(initErr?.message ?? "Failed to initiate upload");
      }

      updateItem(item.id, { fileId: init.file_id });

      await xhrPut(
        init.upload_url,
        item.file,
        item.file.type || "application/octet-stream",
        (pct) => updateItem(item.id, { progress: pct }),
      );

      updateItem(item.id, { status: "confirming", progress: 100 });

      console.log("[upload:single] confirming", { fileId: init.file_id });

      const [confirmed, confirmErr] = await confirmUploadAction({
        payload: { projectId: config.projectId, fileId: init.file_id },
      });

      console.log("[upload:single] confirm response", { confirmed, confirmErr });

      if (confirmErr) {
        throw new Error(confirmErr.message ?? "Failed to confirm upload");
      }

      updateItem(item.id, { status: "done" });
      console.log("[upload:single] done", { name: item.file.name });
    } catch (err) {
      console.error("[upload:single] error", err);
      updateItem(item.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  };

  // ── Presigned URL — multipart ──────────────────────────────────────────────

  const uploadMultipart = async (item: UploadItem, config: UploadConfig) => {
    let uploadId: string | null = null;
    console.log("[upload:multipart] start", { name: item.file.name, size: item.file.size, type: item.file.type });

    try {
      updateItem(item.id, { status: "uploading", progress: 0 });

      const [start, startErr] = await initiateMultipartAction({
        payload: {
          projectId: config.projectId,
          filename: item.file.name,
          content_type: item.file.type || "application/octet-stream",
          total_size_bytes: item.file.size,
          ...(config.folderId ? { folder_id: config.folderId } : {}),
          tags: config.tags ?? [],
          metadata: config.metadata ?? {},
        },
      });

      console.log("[upload:multipart] initiate response", { start, startErr });

      if (startErr || !start) {
        throw new Error(startErr?.message ?? "Failed to start multipart upload");
      }

      uploadId = start.upload_id;
      updateItem(item.id, { uploadId, fileId: start.file_id });

      const chunkCount = Math.ceil(item.file.size / CHUNK_SIZE);
      const completedParts: { part_number: number; etag: string }[] = [];
      console.log("[upload:multipart] chunks", { chunkCount, chunkSize: CHUNK_SIZE });

      for (let i = 0; i < chunkCount; i++) {
        const partNumber = i + 1;
        const startByte = i * CHUNK_SIZE;
        const endByte = Math.min(startByte + CHUNK_SIZE, item.file.size);
        const chunk = item.file.slice(startByte, endByte);

        console.log(`[upload:multipart] part ${partNumber}/${chunkCount}`, { startByte, endByte, chunkSize: chunk.size });

        // Get presigned URL for this part
        const [partData, partErr] = await getPartUrlAction({
          payload: { projectId: config.projectId, uploadId, part: partNumber },
        });

        console.log(`[upload:multipart] part URL response`, { partData, partErr });

        if (partErr || !partData) {
          throw new Error(partErr?.message ?? `Failed to get URL for part ${partNumber}`);
        }

        // XHR PUT the chunk; progress is prorated across all chunks
        const baseProgress = Math.round((i / chunkCount) * 100);
        const { etag } = await xhrPut(
          partData.url,
          chunk,
          item.file.type || "application/octet-stream",
          (pct) => {
            const overall = baseProgress + Math.round((pct / 100) * (100 / chunkCount));
            updateItem(item.id, { progress: Math.min(overall, 99) });
          },
        );

        console.log(`[upload:multipart] part ${partNumber} done`, { etag });

        if (!etag) {
          throw new Error(
            `Part ${partNumber} upload succeeded but ETag was missing. ` +
            "Ensure the S3 bucket CORS policy includes ExposeHeaders: [\"ETag\"].",
          );
        }

        completedParts.push({ part_number: partNumber, etag });
      }

      updateItem(item.id, { status: "confirming", progress: 99 });
      console.log("[upload:multipart] completing", { uploadId, parts: completedParts });

      const [completed, completeErr] = await completeMultipartAction({
        payload: { projectId: config.projectId, uploadId, parts: completedParts },
      });

      console.log("[upload:multipart] complete response", { completed, completeErr });

      if (completeErr) {
        throw new Error(completeErr.message ?? "Failed to complete multipart upload");
      }

      updateItem(item.id, { status: "done", progress: 100 });
      console.log("[upload:multipart] done", { name: item.file.name });
    } catch (err) {
      console.error("[upload:multipart] error — aborting", { uploadId, err });
      // Abort the S3 multipart session to avoid orphaned parts.
      if (uploadId) {
        const [, abortErr] = await abortMultipartAction({
          payload: { projectId: config.projectId, uploadId },
        }).catch((e) => [null, e]);
        console.log("[upload:multipart] abort result", { abortErr });
      }
      updateItem(item.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  };

  // ── Server-side mode ───────────────────────────────────────────────────────

  const uploadServerSide = async (item: UploadItem, config: UploadConfig) => {
    console.log("[upload:server] start", { name: item.file.name, size: item.file.size });
    try {
      // Progress is indeterminate — the server doesn't stream progress back.
      updateItem(item.id, { status: "uploading", progress: -1 });

      const body = new FormData();
      body.append("file", item.file);
      body.append("projectId", config.projectId);
      if (config.folderId) body.append("folderId", config.folderId);
      body.append("tags", JSON.stringify(config.tags ?? []));
      body.append("metadata", JSON.stringify(config.metadata ?? {}));

      const res = await fetch("/api/upload", { method: "POST", body });
      console.log("[upload:server] response status", res.status);

      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        console.error("[upload:server] error response", json);
        throw new Error(json.error ?? `Server upload failed: ${res.status}`);
      }

      const result = await res.json() as { file_id: string; status: string };
      console.log("[upload:server] done", result);
      updateItem(item.id, { status: "done", progress: 100 });
    } catch (err) {
      console.error("[upload:server] error", err);
      updateItem(item.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  };

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Start uploading all queued files with the given configuration. */
  const startUpload = useCallback(
    async (config: UploadConfig) => {
      const queued = items.filter((i) => i.status === "queued");
      if (queued.length === 0) return;

      await Promise.all(
        queued.map((item) => {
          if (config.uploadMode === "server") {
            return uploadServerSide(item, config);
          }
          return item.isMultipart
            ? uploadMultipart(item, config)
            : uploadSingle(item, config);
        }),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items],
  );

  const isUploading = items.some(
    (i) => i.status === "uploading" || i.status === "confirming",
  );

  const allDone =
    items.length > 0 && items.every((i) => i.status === "done" || i.status === "error");

  const hasQueued = items.some((i) => i.status === "queued");

  return {
    items,
    addFiles,
    removeFile,
    clearAll,
    startUpload,
    isUploading,
    allDone,
    hasQueued,
    xhrMapRef,
  };
}
