/**
 * @filenest/react hooks/useFile — single file detail with revalidation.
 * @module
 */

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { FileRecord } from "@filenest/core";
import { useFileNest } from "../context/FileNestContext.js";

export interface UseFileOptions {
  includeVersions?: boolean;
  includeProcessing?: boolean;
  enabled?: boolean;
}

export function useFile(fileId: string, options: UseFileOptions = {}) {
  const { projectId, getFile } = useFileNest();
  const queryClient = useQueryClient();
  const queryKey = ["filenest", "file", projectId, fileId, options];

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => getFile(fileId),
    enabled: !!fileId && options.enabled !== false,
  });

  const mutate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    file: data ?? null,
    isLoading,
    isError,
    error: error as Error | null,
    mutate,
  };
}
