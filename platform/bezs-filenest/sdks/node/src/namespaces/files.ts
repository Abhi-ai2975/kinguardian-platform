/**
 * @filenest/node namespaces/files — FilesNamespace implementation.
 *
 * Provides all file operations: upload (single + auto-multipart), download,
 * list, get, update metadata/tags, soft delete, and version management.
 *
 * Upload flow (both single and multipart):
 *   1. POST JSON to init endpoint → receive presigned storage URL + file_id
 *   2. PUT bytes directly to presigned storage URL (bypasses backend)
 *   3. POST /confirm → triggers processing pipeline
 *
 * @module
 */

import { createHmac } from "crypto";
import type { Readable } from "stream";
import type { FileNestHttpClient } from "@filenest/core";
import type {
  DownloadUrlResponse,
  FileRecord,
  FileVersion,
  ListResponse,
  MultipartSession,
  UploadProgress,
} from "@filenest/core";

const MULTIPART_THRESHOLD = 5 * 1024 * 1024; // 5 MB

export interface UploadOptions {
  filename: string;
  data: Buffer | Readable | Uint8Array;
  mimeType?: string;
  size?: number;
  folderId?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  onProgress?: (progress: UploadProgress) => void;
}

export interface FileListFilters {
  folderId?: string;
  mimeType?: string;
  status?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  metadata?: Record<string, string>;
}

export interface FileUpdateOptions {
  tags?: string[];
  metadata?: Record<string, unknown>;
  filename?: string;
}

export interface GetDownloadUrlOptions {
  ttl?: number;
  disposition?: "inline" | "attachment";
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks);
}

class FileVersionsNamespace {
  constructor(
    private readonly http: FileNestHttpClient,
    private readonly projectId: string
  ) {}

  async list(fileId: string): Promise<{ items: FileVersion[]; total: number }> {
    return this.http.get(`/v1/projects/${this.projectId}/files/${fileId}/versions`);
  }

  async restore(fileId: string, versionId: string): Promise<{ fileId: string; versionNumber: number }> {
    return this.http.post(`/v1/projects/${this.projectId}/files/${fileId}/versions/${versionId}/restore`);
  }
}

export class FilesNamespace {
  readonly versions: FileVersionsNamespace;

  constructor(
    private readonly http: FileNestHttpClient,
    private readonly projectId: string
  ) {
    this.versions = new FileVersionsNamespace(http, projectId);
  }

  async upload(options: UploadOptions): Promise<FileRecord> {
    let data: Buffer;
    if (Buffer.isBuffer(options.data) || options.data instanceof Uint8Array) {
      data = Buffer.from(options.data);
    } else {
      data = await streamToBuffer(options.data as Readable);
    }

    if (data.length >= MULTIPART_THRESHOLD) {
      return this._multipartUpload(data, options);
    }
    return this._singleUpload(data, options);
  }

  private async _singleUpload(data: Buffer, options: UploadOptions): Promise<FileRecord> {
    const contentType = options.mimeType ?? "application/octet-stream";

    // 1. Init: tell the backend about the file, receive presigned PUT URL
    const init = await this.http.post<{ fileId: string; uploadUrl: string; expiresAt: string }>(
      `/v1/projects/${this.projectId}/files/upload`,
      {
        filename: options.filename,
        content_type: contentType,
        size_bytes: data.length,
        folder_id: options.folderId ?? null,
        metadata: options.metadata ?? {},
        tags: options.tags ?? [],
      }
    );

    options.onProgress?.({ bytesUploaded: 0, totalBytes: data.length, percentage: 0, chunkNumber: 1, totalChunks: 1 });

    // 2. PUT bytes directly to storage via the presigned URL
    await fetch(init.uploadUrl, {
      method: "PUT",
      body: data,
      headers: { "Content-Type": contentType },
    });

    options.onProgress?.({ bytesUploaded: data.length, totalBytes: data.length, percentage: 100, chunkNumber: 1, totalChunks: 1 });

    // 3. Confirm upload — triggers the processing pipeline
    await this.http.post(`/v1/projects/${this.projectId}/files/${init.fileId}/confirm`);

    return this.http.get(`/v1/projects/${this.projectId}/files/${init.fileId}`);
  }

  private async _multipartUpload(data: Buffer, options: UploadOptions): Promise<FileRecord> {
    const contentType = options.mimeType ?? "application/octet-stream";

    // 1. Start multipart session
    const session = await this.http.post<MultipartSession>(
      `/v1/projects/${this.projectId}/files/upload/multipart/start`,
      {
        filename: options.filename,
        content_type: contentType,
        total_size_bytes: data.length,
        folder_id: options.folderId ?? null,
        metadata: options.metadata ?? {},
        tags: options.tags ?? [],
      }
    );

    const CHUNK_SIZE = 5 * 1024 * 1024;
    const totalChunks = Math.ceil(data.length / CHUNK_SIZE);
    const parts: { part_number: number; etag: string }[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const chunk = data.slice(start, start + CHUNK_SIZE);

      // Get presigned URL for this part
      const { url } = await this.http.get<{ url: string }>(
        `/v1/projects/${this.projectId}/files/upload/multipart/${session.uploadId}/part-url`,
        { part: i + 1 }
      );

      // Upload part directly to storage
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

    // 2. Complete — assemble all parts
    const result = await this.http.post<{ fileId: string; status: string }>(
      `/v1/projects/${this.projectId}/files/upload/multipart/${session.uploadId}/complete`,
      { parts }
    );

    return this.http.get(`/v1/projects/${this.projectId}/files/${result.fileId}`);
  }

  /** Get a presigned download URL. The URL can be used to download the file directly from storage. */
  async getDownloadUrl(fileId: string, options: GetDownloadUrlOptions = {}): Promise<DownloadUrlResponse> {
    return this.http.get(`/v1/projects/${this.projectId}/files/${fileId}/download`, {
      ttl: options.ttl,
      disposition: options.disposition,
    });
  }

  /** Stream the file bytes via the presigned download URL. */
  async download(fileId: string): Promise<Readable> {
    const { url } = await this.getDownloadUrl(fileId);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Storage download failed: ${res.status}`);
    const { Readable } = await import("stream");
    return Readable.fromWeb(res.body as unknown as ReadableStream<Uint8Array>);
  }

  /** Download and buffer the full file in memory. */
  async downloadToBuffer(fileId: string): Promise<Buffer> {
    const stream = await this.download(fileId);
    return streamToBuffer(stream);
  }

  async list(filters: FileListFilters = {}): Promise<ListResponse<FileRecord>> {
    const { metadata, tags, ...rest } = filters;
    return this.http.get(`/v1/projects/${this.projectId}/files`, {
      ...rest,
      ...(metadata ? { metadata: JSON.stringify(metadata) } : {}),
      ...(tags ? { tags: tags.join(",") } : {}),
    } as Record<string, string | number | boolean | undefined>);
  }

  async get(fileId: string): Promise<FileRecord> {
    return this.http.get(`/v1/projects/${this.projectId}/files/${fileId}`);
  }

  async update(fileId: string, options: FileUpdateOptions): Promise<FileRecord> {
    return this.http.patch(`/v1/projects/${this.projectId}/files/${fileId}`, options);
  }

  async delete(fileId: string): Promise<void> {
    return this.http.delete(`/v1/projects/${this.projectId}/files/${fileId}`);
  }

  async restore(fileId: string): Promise<FileRecord> {
    return this.http.post(`/v1/projects/${this.projectId}/files/${fileId}/restore`);
  }

  /** Verify an HMAC-SHA256 webhook signature. */
  static verifyWebhookSignature(rawBody: Buffer, signature: string, secret: string): boolean {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const received = signature.replace("sha256=", "");
    return expected === received;
  }
}
