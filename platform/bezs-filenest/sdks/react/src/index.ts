/**
 * @filenest/react — FileNest SDK for React.
 *
 * Provides the FileNestProvider context, upload and preview components,
 * and TanStack Query-backed data hooks for file operations.
 *
 * Usage:
 *   import { FileNestProvider, FileUpload, useFiles } from '@filenest/react';
 *
 * @module
 */

// Context + Provider
export { FileNestProvider, useFileNest } from "./context/FileNestContext.js";
export type {
  FileNestProviderProps,
  FileNestContextValue,
  // Upload types
  InitUploadOptions,
  InitUploadResult,
  UploadToStorageOptions,
  ConfirmUploadResult,
  UploadOptions,
  // File types
  FileListFilters,
  FileUpdateOptions,
  DownloadUrlOptions,
  DownloadUrlResult,
  // Folder types
  FolderListOptions,
  CreateFolderOptions,
  // Search types
  SearchQuery,
  SearchResults,
} from "./context/FileNestContext.js";

// Components
export { FileUpload } from "./components/FileUpload.js";
export type { FileUploadProps, MetadataFormField } from "./components/FileUpload.js";

export { FilePreview } from "./components/FilePreview.js";
export type { FilePreviewProps } from "./components/FilePreview.js";

export { FileViewer } from "./components/FileViewer.js";
export type { FileViewerProps } from "./components/FileViewer.js";

// Hooks
export { useUpload } from "./hooks/useUpload.js";
export type { UseUploadOptions, UploadState, UploadStatus } from "./hooks/useUpload.js";

export { useUploadToken } from "./hooks/useUploadToken.js";
export type { UseUploadTokenResult } from "./hooks/useUploadToken.js";

export { useFiles } from "./hooks/useFiles.js";
export type { UseFilesOptions } from "./hooks/useFiles.js";

export { useFile } from "./hooks/useFile.js";
export type { UseFileOptions } from "./hooks/useFile.js";

export { useSearch } from "./hooks/useSearch.js";
export type { UseSearchOptions } from "./hooks/useSearch.js";

export { useFolder } from "./hooks/useFolder.js";
export type { UseFolderResult, Breadcrumb } from "./hooks/useFolder.js";

export { useInfiniteFiles } from "./hooks/useInfiniteFiles.js";
export type { UseInfiniteFilesOptions } from "./hooks/useInfiniteFiles.js";

// Re-export core types
export type {
  FileRecord,
  FileStatus,
  FileVersion,
  Folder,
  Project,
  Webhook,
  SearchResults as CoreSearchResults,
  SearchHit,
  SearchFilters,
  SearchFacets,
  UploadProgress,
  UploadToken,
  ListResponse,
} from "@filenest/core";
