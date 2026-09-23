/**
 * file.queries — TanStack Query key factory for the files list.
 *
 * Centralises cache keys so mutations (delete) can invalidate the right
 * entries with fileKeys.lists(projectId) without scattering string literals.
 *
 * @module
 */
import type { TListFilesParams } from "@/modules/entities/schemas/file";

export const fileKeys = {
  all: (projectId: string) => ["files", projectId] as const,
  lists: (projectId: string) => [...fileKeys.all(projectId), "list"] as const,
  list: (params: TListFilesParams) =>
    [...fileKeys.lists(params.projectId), params] as const,
};
