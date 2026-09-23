/**
 * @filenest/node namespaces/folders — FoldersNamespace implementation.
 * @module
 */

import type { FileNestHttpClient, FileRecord, Folder, ListResponse } from "@filenest/core";

export interface FolderCreateOptions {
  name: string;
  parentFolderId?: string;
  metadata?: Record<string, unknown>;
}

export interface FolderListOptions {
  /** Filter folders by exact name match. */
  name?: string;
}

export interface FolderListFilesOptions {
  q?: string;
  tags?: string[];
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
  cursor?: string;
}

export class FoldersNamespace {
  constructor(
    private readonly http: FileNestHttpClient,
    private readonly projectId: string
  ) {}

  async create(options: FolderCreateOptions): Promise<Folder> {
    return this.http.post(`/v1/projects/${this.projectId}/folders`, {
      name: options.name,
      parent_folder_id: options.parentFolderId,
      metadata: options.metadata,
    });
  }

  async list(options: FolderListOptions = {}): Promise<ListResponse<Folder>> {
    return this.http.get(`/v1/projects/${this.projectId}/folders`, {
      name: options.name,
    });
  }

  async get(folderId: string): Promise<Folder> {
    return this.http.get(`/v1/projects/${this.projectId}/folders/${folderId}`);
  }

  /** Resolve a slash-separated path string to the matching folder. Returns null if not found. */
  async getByPath(path: string): Promise<Folder | null> {
    try {
      return await this.http.get(`/v1/projects/${this.projectId}/folders/by-path`, { path });
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  /**
   * Idempotently create every missing segment of a path and return the leaf folder.
   * If the full path already exists the existing folder is returned unchanged.
   *
   * @example
   * const folder = await fn.folders.ensurePath("users/alice/uploads");
   */
  async ensurePath(path: string): Promise<Folder> {
    return this.http.post(`/v1/projects/${this.projectId}/folders/ensure-path`, { path });
  }

  /** List all files directly inside a folder with optional filters and pagination. */
  async listFiles(folderId: string, options: FolderListFilesOptions = {}): Promise<ListResponse<FileRecord>> {
    return this.http.get(`/v1/projects/${this.projectId}/folders/${folderId}/files`, {
      q: options.q,
      tags: options.tags?.join(","),
      category: options.category,
      status: options.status,
      limit: options.limit,
      offset: options.offset,
      cursor: options.cursor,
    });
  }

  async delete(folderId: string): Promise<void> {
    return this.http.delete(`/v1/projects/${this.projectId}/folders/${folderId}`);
  }
}
