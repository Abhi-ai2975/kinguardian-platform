/**
 * @filenest/react hooks/useInfiniteFiles — infinite-scroll file list via useInfiniteQuery.
 *
 * Feeds the FileExplorer's scroll-to-load pattern. Each page is fetched
 * automatically as the user scrolls to the sentinel element at the bottom of
 * the list. Call `fetchMore()` when the sentinel enters the viewport.
 *
 * @module
 */

import { useInfiniteQuery } from "@tanstack/react-query";
import type { FileRecord, ListResponse } from "@filenest/core";
import { useFileNest } from "../context/FileNestContext.js";

export interface UseInfiniteFilesOptions {
  folderId?: string | null;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  searchQuery?: string;
  limit?: number;
  enabled?: boolean;
}

export function useInfiniteFiles(opts: UseInfiniteFilesOptions = {}) {
  const { projectId, listFiles } = useFileNest();
  const limit = opts.limit ?? 50;

  const query = useInfiniteQuery({
    queryKey: [
      "filenest",
      "files-infinite",
      projectId,
      opts.folderId ?? "root",
      opts.sortBy,
      opts.sortOrder,
      opts.searchQuery,
    ],
    queryFn: ({ pageParam = 0 }: { pageParam?: number }): Promise<ListResponse<FileRecord>> =>
      listFiles({
        folderId: opts.folderId,
        sortBy: opts.sortBy,
        sortOrder: opts.sortOrder,
        limit,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const next = lastPage.offset + lastPage.limit;
      return next < lastPage.total ? next : undefined;
    },
    enabled: opts.enabled !== false,
  });

  return {
    files: query.data?.pages.flatMap((p) => p.items) ?? [],
    totalCount: query.data?.pages[0]?.total ?? 0,
    hasMore: query.hasNextPage,
    isLoading: query.isLoading,
    isFetchingMore: query.isFetchingNextPage,
    fetchMore: query.fetchNextPage,
    refresh: query.refetch,
  };
}
