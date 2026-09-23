/**
 * @filenest/node namespaces/upload-tokens — UploadTokensNamespace implementation.
 *
 * Generates short-lived upload tokens for use by browser clients.
 * The token is passed to `<FileNestProvider tokenEndpoint>` or used directly
 * in the `Authorization: Bearer` header by `@filenest/react`.
 *
 * @module
 */

import type { FileNestHttpClient, UploadToken } from "@filenest/core";

export interface CreateUploadTokenOptions {
  maxSize?: number;
  allowedMimeTypes?: string[];
  maxFiles?: number;
  folderId?: string;
  metadata?: Record<string, unknown>;
  /** Tags applied to every file uploaded with this token. Merged with any tags the browser sends. */
  tags?: string[];
  expiresIn?: number;
  /** End-user ID to embed in the token. Copied to every file uploaded with it. */
  ownerUserId?: string;
  /** End-user's org ID to embed in the token. Copied to every file uploaded with it. */
  ownerOrgId?: string;
}

export class UploadTokensNamespace {
  constructor(
    private readonly http: FileNestHttpClient,
    private readonly projectId: string
  ) {}

  async create(options: CreateUploadTokenOptions = {}): Promise<UploadToken> {
    return this.http.post(`/v1/projects/${this.projectId}/upload-tokens`, {
      max_size: options.maxSize,
      allowed_mime_types: options.allowedMimeTypes,
      max_files: options.maxFiles,
      folder_id: options.folderId,
      metadata: options.metadata,
      tags: options.tags,
      expires_in: options.expiresIn,
      owner_user_id: options.ownerUserId,
      owner_org_id: options.ownerOrgId,
    });
  }
}
