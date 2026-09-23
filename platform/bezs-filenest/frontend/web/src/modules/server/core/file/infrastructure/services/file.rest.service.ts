/**
 * file.rest.service — REST implementation of IFileService.
 *
 * Layer: core / file / infrastructure / services
 *
 * Calls the FileNest FastAPI backend via filenestApi. Validates every
 * response against canonical Zod schemas before returning so schema
 * drift between backend and frontend is caught at the boundary.
 *
 * Bound in the DI container by registerFileModule().
 *
 * @module
 */
"server-only";

import { filenestApi } from "@/modules/server/utils/api-client";
import {
  FileSchema,
  FileListSchema,
  FileDownloadUrlSchema,
  TagsResponseSchema,
  MetadataResponseSchema,
  UploadInitResponseSchema,
  ConfirmUploadResponseSchema,
  MultipartStartResponseSchema,
  PartUrlResponseSchema,
  MultipartCompleteResponseSchema,
  MultipartAbortResponseSchema,
  type TFile,
  type TFileList,
  type TFileDownloadUrl,
  type TListFilesParams,
  type TTagsResponse,
  type TMetadataResponse,
  type TInitiateUpload,
  type TUploadInitResponse,
  type TConfirmUploadResponse,
  type TInitiateMultipart,
  type TMultipartStartResponse,
  type TGetPartUrl,
  type TPartUrlResponse,
  type TCompleteMultipart,
  type TMultipartCompleteResponse,
  type TAbortMultipart,
  type TMultipartAbortResponse,
} from "@/modules/entities/schemas/file";
import { OutputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import type { IFileService } from "../../domain/interfaces/file.service.interface";

export class FileRestService implements IFileService {
  async list(
    projectId: string,
    params?: Omit<TListFilesParams, "projectId">,
  ): Promise<TFileList> {
    let qs = "";
    if (params) {
      const parts: string[] = [];
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null || v === "") continue;
        if (Array.isArray(v)) {
          // tags: repeat the param — ?tags=a&tags=b
          for (const item of v) {
            parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(item))}`);
          }
        } else {
          parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
        }
      }
      if (parts.length > 0) qs = "?" + parts.join("&");
    }
    const raw = await filenestApi<unknown>(`/v1/projects/${projectId}/files${qs}`);
    const parsed = FileListSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async getDownloadUrl(
    projectId: string,
    fileId: string,
    ttl?: number,
  ): Promise<TFileDownloadUrl> {
    const qs = ttl ? `?ttl=${ttl}` : "";
    const raw = await filenestApi<unknown>(
      `/v1/projects/${projectId}/files/${fileId}/download${qs}`,
    );
    const parsed = FileDownloadUrlSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async delete(projectId: string, fileId: string): Promise<void> {
    await filenestApi<void>(`/v1/projects/${projectId}/files/${fileId}`, {
      method: "DELETE",
    });
  }

  async setTags(projectId: string, fileId: string, tags: string[]): Promise<TTagsResponse> {
    const raw = await filenestApi<unknown>(
      `/v1/projects/${projectId}/files/${fileId}/tags`,
      { method: "PUT", body: JSON.stringify({ tags }) },
    );
    const parsed = TagsResponseSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async addTags(projectId: string, fileId: string, tags: string[]): Promise<TTagsResponse> {
    const raw = await filenestApi<unknown>(
      `/v1/projects/${projectId}/files/${fileId}/tags`,
      { method: "POST", body: JSON.stringify({ tags }) },
    );
    const parsed = TagsResponseSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async updateMetadata(projectId: string, fileId: string, metadata: Record<string, unknown>): Promise<TMetadataResponse> {
    const raw = await filenestApi<unknown>(
      `/v1/projects/${projectId}/files/${fileId}/metadata`,
      { method: "PUT", body: JSON.stringify({ metadata }) },
    );
    const parsed = MetadataResponseSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async mergeMetadata(projectId: string, fileId: string, metadata: Record<string, unknown>): Promise<TMetadataResponse> {
    const raw = await filenestApi<unknown>(
      `/v1/projects/${projectId}/files/${fileId}/metadata`,
      { method: "PATCH", body: JSON.stringify({ metadata }) },
    );
    const parsed = MetadataResponseSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  // ── Upload — single-file presigned URL flow ────────────────────────────────

  async initiateUpload(params: TInitiateUpload): Promise<TUploadInitResponse> {
    const { projectId, ...body } = params;
    const raw = await filenestApi<unknown>(
      `/v1/projects/${projectId}/files/upload`,
      { method: "POST", body: JSON.stringify(body) },
    );
    const parsed = UploadInitResponseSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async confirmUpload(projectId: string, fileId: string): Promise<TConfirmUploadResponse> {
    const raw = await filenestApi<unknown>(
      `/v1/projects/${projectId}/files/${fileId}/confirm`,
      { method: "POST" },
    );
    const parsed = ConfirmUploadResponseSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  // ── Upload — multipart flow ────────────────────────────────────────────────

  async initiateMultipart(params: TInitiateMultipart): Promise<TMultipartStartResponse> {
    const { projectId, ...body } = params;
    const raw = await filenestApi<unknown>(
      `/v1/projects/${projectId}/files/upload/multipart/start`,
      { method: "POST", body: JSON.stringify(body) },
    );
    const parsed = MultipartStartResponseSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async getPartUrl(params: TGetPartUrl): Promise<TPartUrlResponse> {
    const { projectId, uploadId, part } = params;
    const raw = await filenestApi<unknown>(
      `/v1/projects/${projectId}/files/upload/multipart/${uploadId}/part-url?part=${part}`,
    );
    const parsed = PartUrlResponseSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async completeMultipart(params: TCompleteMultipart): Promise<TMultipartCompleteResponse> {
    const { projectId, uploadId, parts } = params;
    // Backend uses alias names PartNumber / ETag (AWS S3 SDK convention).
    const body = {
      parts: parts.map((p) => ({ PartNumber: p.part_number, ETag: p.etag })),
    };
    const raw = await filenestApi<unknown>(
      `/v1/projects/${projectId}/files/upload/multipart/${uploadId}/complete`,
      { method: "POST", body: JSON.stringify(body) },
    );
    const parsed = MultipartCompleteResponseSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async abortMultipart(params: TAbortMultipart): Promise<TMultipartAbortResponse> {
    const { projectId, uploadId } = params;
    const raw = await filenestApi<unknown>(
      `/v1/projects/${projectId}/files/upload/multipart/${uploadId}`,
      { method: "DELETE" },
    );
    const parsed = MultipartAbortResponseSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async rename(projectId: string, fileId: string, filename: string): Promise<TFile> {
    const raw = await filenestApi<unknown>(
      `/v1/projects/${projectId}/files/${fileId}`,
      { method: "PATCH", body: JSON.stringify({ filename }) },
    );
    const parsed = FileSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async move(projectId: string, fileId: string, folderId: string | null): Promise<TFile> {
    const raw = await filenestApi<unknown>(
      `/v1/projects/${projectId}/files/${fileId}/move`,
      { method: "POST", body: JSON.stringify({ folder_id: folderId }) },
    );
    const parsed = FileSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }
}
