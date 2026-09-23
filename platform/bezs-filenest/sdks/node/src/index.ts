/**
 * @filenest/node — FileNest SDK for Node.js.
 *
 * Server-side client for the FileNest API. Handles upload (single + multipart),
 * download, search, folders, webhooks, and upload token generation.
 *
 * Usage:
 *   import { FileNest } from '@filenest/node';
 *   const fn = new FileNest({ apiKey, projectId });
 *
 * @module
 */

export { FileNest } from "./client.js";
export type { FileNestConfig } from "./client.js";

// Namespace types
export type { UploadOptions, FileListFilters, FileUpdateOptions, GetDownloadUrlOptions } from "./namespaces/files.js";
export type { FolderCreateOptions, FolderListOptions } from "./namespaces/folders.js";
export type { SearchOptions } from "./namespaces/search.js";
export type { WebhookCreateOptions, WebhookUpdateOptions } from "./namespaces/webhooks.js";
export type { CreateUploadTokenOptions } from "./namespaces/upload-tokens.js";
export type { UploadSessionCreateOptions, ResumeUploadOptions } from "./namespaces/uploads.js";

// Re-export all types and errors from core
export * from "@filenest/core";
