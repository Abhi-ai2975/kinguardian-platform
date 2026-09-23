/**
 * @filenest/react hooks/useFolder — folder navigation with breadcrumbs.
 * @module
 */

import { useQuery } from "@tanstack/react-query";
import type { FileRecord, Folder } from "@filenest/core";
import { useFileNest } from "../context/FileNestContext.js";

export interface Breadcrumb {
  id: string | null;
  name: string;
}

export interface UseFolderResult {
  folder: Folder | null;
  files: FileRecord[];
  subfolders: Folder[];
  isLoading: boolean;
  breadcrumbs: Breadcrumb[];
}

export function useFolder(folderId: string | null): UseFolderResult {
  const { projectId, getFolder, listFiles, listFolders } = useFileNest();

  const { data, isLoading } = useQuery({
    queryKey: ["filenest", "folder", projectId, folderId],
    queryFn: async () => {
      const [folderData, filesData, subfoldersData] = await Promise.all([
        folderId ? getFolder(folderId) : Promise.resolve(null),
        listFiles({ folderId: folderId ?? null, limit: 100 }),
        listFolders({ parentFolderId: folderId ?? null }),
      ]);
      return {
        folder: folderData,
        files: filesData.items,
        subfolders: subfoldersData.items,
      };
    },
  });

  const buildBreadcrumbs = (): Breadcrumb[] => {
    const crumbs: Breadcrumb[] = [{ id: null, name: "Root" }];
    if (data?.folder) {
      const parts = data.folder.path.split("/").filter(Boolean);
      parts.forEach((name, i) => {
        crumbs.push({ id: i < parts.length - 1 ? `path-${i}` : data.folder!.id, name });
      });
    }
    return crumbs;
  };

  return {
    folder: data?.folder ?? null,
    files: data?.files ?? [],
    subfolders: data?.subfolders ?? [],
    isLoading,
    breadcrumbs: buildBreadcrumbs(),
  };
}
