/**
 * FolderModalProvider — mounts all folder modals once, client-only.
 *
 * Render once per files page alongside FileModalProvider.
 *
 * @module
 */
"use client";

import { useEffect, useState } from "react";
import { CreateFolderModal } from "@/modules/client/files/modals/CreateFolderModal";
import { DeleteFolderModal } from "@/modules/client/files/modals/DeleteFolderModal";

interface FolderModalProviderProps {
  projectId: string;
}

export function FolderModalProvider({ projectId }: FolderModalProviderProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <>
      <CreateFolderModal projectId={projectId} />
      <DeleteFolderModal projectId={projectId} />
    </>
  );
}
