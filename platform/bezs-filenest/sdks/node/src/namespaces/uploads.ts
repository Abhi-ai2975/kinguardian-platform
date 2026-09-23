/**
 * @filenest/node namespaces/uploads — UploadsNamespace for resumable multipart sessions.
 *
 * Use this when you want manual control over the multipart session lifecycle
 * (e.g., resumable uploads where the session can survive a network interruption).
 * For simple uploads, `files.upload()` handles multipart automatically.
 *
 * @module
 */

import type { Readable } from "stream";
import type { FileNestHttpClient, FileRecord, MultipartSession, UploadProgress } from "@filenest/core";

export interface UploadSessionCreateOptions {
  filename: string;
  /** Total file size in bytes. */
  sizeBytes: number;
  mimeType?: string;
  folderId?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface ResumeUploadOptions {
  data: Buffer | Readable;
  onProgress?: (progress: UploadProgress) => void;
}

export class UploadsNamespace {
  constructor(
    private readonly http: FileNestHttpClient,
    private readonly projectId: string
  ) {}

  /** Create a new multipart upload session and return the session IDs. */
  async create(options: UploadSessionCreateOptions): Promise<MultipartSession> {
    return this.http.post(`/v1/projects/${this.projectId}/files/upload/multipart/start`, {
      filename: options.filename,
      content_type: options.mimeType ?? "application/octet-stream",
      total_size_bytes: options.sizeBytes,
      folder_id: options.folderId ?? null,
      metadata: options.metadata ?? {},
      tags: options.tags ?? [],
    });
  }

  /** Upload all parts for an existing session and complete it. */
  async resume(uploadId: string, options: ResumeUploadOptions): Promise<FileRecord> {
    let data: Buffer;
    if (Buffer.isBuffer(options.data)) {
      data = options.data;
    } else {
      const { default: streamToBuffer } = await import("../utils/stream-to-buffer.js");
      data = await streamToBuffer(options.data as Readable);
    }

    const CHUNK_SIZE = 5 * 1024 * 1024;
    const totalChunks = Math.ceil(data.length / CHUNK_SIZE);
    const parts: { part_number: number; etag: string }[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const chunk = data.slice(start, start + CHUNK_SIZE);

      const { url } = await this.http.get<{ url: string }>(
        `/v1/projects/${this.projectId}/files/upload/multipart/${uploadId}/part-url`,
        { part: i + 1 }
      );

      const partRes = await fetch(url, { method: "PUT", body: chunk });
      const etag = partRes.headers.get("etag") ?? "";
      parts.push({ part_number: i + 1, etag });

      options.onProgress?.({
        bytesUploaded: Math.min((i + 1) * CHUNK_SIZE, data.length),
        totalBytes: data.length,
        percentage: Math.round(((i + 1) / totalChunks) * 100),
        chunkNumber: i + 1,
        totalChunks,
      });
    }

    const result = await this.http.post<{ fileId: string; status: string }>(
      `/v1/projects/${this.projectId}/files/upload/multipart/${uploadId}/complete`,
      { parts }
    );

    return this.http.get(`/v1/projects/${this.projectId}/files/${result.fileId}`);
  }

  /** Abort a multipart session and discard all uploaded parts. */
  async abort(uploadId: string): Promise<void> {
    await this.http.delete(`/v1/projects/${this.projectId}/files/upload/multipart/${uploadId}`);
  }
}
