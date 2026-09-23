/**
 * FileModalProvider — mounts all file modals once, client-only.
 *
 * The mount guard (isMounted) ensures modals are never rendered during SSR.
 * Render <FileModalProvider /> once in the files page alongside the table.
 *
 * Props are forwarded to modals that need page-level context (projectId,
 * folders, projectConfig) which is not suitable for the Zustand store.
 *
 * @module
 */
"use client";

import { useEffect, useState } from "react";
import { DeleteFileModal } from "@/modules/client/files/modals/DeleteFileModal";
import { RenameFileModal } from "@/modules/client/files/modals/RenameFileModal";
import { MoveFileModal } from "@/modules/client/files/modals/MoveFileModal";
import { FileMetadataPanel } from "@/modules/client/files/components/FileMetadataPanel";
import { FileUploadModal } from "@/modules/client/files/components/upload/FileUploadModal";
import type { TFolderList } from "@/modules/entities/schemas/folder";
import type { TProjectConfig } from "@/modules/entities/schemas/project-config";

interface FileModalProviderProps {
  projectId: string;
  folders: TFolderList;
  /** Project configuration — used to enforce upload constraints in the dropzone. */
  projectConfig: TProjectConfig | null;
}

export function FileModalProvider({ projectId, folders, projectConfig }: FileModalProviderProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <>
      <DeleteFileModal />
      <RenameFileModal />
      <MoveFileModal folders={folders} />
      <FileMetadataPanel />
      <FileUploadModal
        projectId={projectId}
        folders={folders}
        projectConfig={projectConfig}
      />
    </>
  );
}
