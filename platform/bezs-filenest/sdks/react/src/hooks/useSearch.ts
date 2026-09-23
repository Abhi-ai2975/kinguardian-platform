/**
 * @filenest/react hooks/useSearch — debounced full-text + faceted search.
 * @module
 */

import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SearchFacets, SearchHit } from "@filenest/core";
import { useFileNest } from "../context/FileNestContext.js";
import type { SearchQuery } from "../context/FileNestContext.js";

export type { SearchQuery };

export interface UseSearchOptions {
  debounceMs?: number;
  facets?: string[];
  limit?: number;
}

export function useSearch(options: UseSearchOptions = {}) {
  const { projectId, search: contextSearch } = useFileNest();
  const queryClient = useQueryClient();
  const debounceMs = options.debounceMs ?? 300;
  const [currentQuery, setCurrentQuery] = useState<SearchQuery>({});
  const [queryTimeMs, setQueryTimeMs] = useState(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryKey = ["filenest", "search", projectId, currentQuery, options.facets];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!currentQuery.q && !Object.keys(currentQuery.filters ?? {}).length) {
        return { hits: [] as SearchHit[], total: 0, facets: undefined as SearchFacets | undefined, queryTimeMs: 0 };
      }
      const result = await contextSearch({
        ...currentQuery,
        limit: options.limit ?? 20,
      });
      setQueryTimeMs(result.queryTimeMs);
      return result;
    },
    enabled: true,
  });

  const search = useCallback(
    (query: SearchQuery) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        setCurrentQuery(query);
        queryClient.invalidateQueries({ queryKey: ["filenest", "search", projectId] });
      }, debounceMs);
    },
    [debounceMs, projectId, queryClient]
  );

  return {
    results: data?.hits ?? [],
    facets: data?.facets,
    isLoading,
    totalCount: data?.total ?? 0,
    queryTimeMs,
    search,
    hasMore: (data?.hits?.length ?? 0) < (data?.total ?? 0),
  };
}
