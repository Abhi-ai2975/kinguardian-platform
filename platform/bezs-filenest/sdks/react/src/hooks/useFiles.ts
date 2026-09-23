/**
 * @filenest/react hooks/useFiles — TanStack Query-backed file list with pagination.
 * @module
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { FileRecord, ListResponse, SearchFilters } from "@filenest/core";
import { useFileNest } from "../context/FileNestContext.js";

export interface UseFilesOptions {
  folderId?: string | null;
  filters?: SearchFilters & { metadata?: Record<string, string> };
  tags?: string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  enabled?: boolean;
}

export function useFiles(options: UseFilesOptions = {}) {
  const { projectId, listFiles } = useFileNest();
  const [offset, setOffset] = useState(0);
  const limit = options.limit ?? 20;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["filenest", "files", projectId, options, offset],
    queryFn: () =>
      listFiles({
        folderId: options.folderId,
        tags: options.tags,
        sortBy: options.sortBy,
        sortOrder: options.sortOrder,
        metadata: options.filters?.metadata,
        limit,
        offset,
      }),
    enabled: options.enabled !== false,
  });

  return {
    files: data?.items ?? [],
    totalCount: data?.total ?? 0,
    hasMore: data?.hasMore ?? false,
    isLoading,
    isError,
    error: error as Error | null,
    loadMore: () => setOffset((o) => o + limit),
    refresh: () => refetch(),
  };
}
