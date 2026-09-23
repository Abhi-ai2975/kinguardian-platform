/**
 * FilesPage — lists all files in the active project with an optional folder filter.
 *
 * Server component: fetches the first 200 files (optionally filtered by folder_id)
 * and the full folder list in parallel. The folder list is used to render a
 * FolderTree sidebar that pushes ?folder_id=xxx to the URL on selection.
 * FilesTable re-queries when the URL changes.
 *
 * @module
 */
import { Suspense } from "react";
import { listFilesAction } from "@/modules/server/presentation/actions/file.actions";
import { listFoldersAction } from "@/modules/server/presentation/actions/folder.actions";
import { getProjectConfigAction } from "@/modules/server/presentation/actions/project-config.actions";
import { FilesTable } from "@/modules/client/files/components/FilesTable";
import { FolderTree } from "@/modules/client/files/components/FolderTree";
import { FileModalProvider } from "@/modules/client/files/provider/FileModalProvider";
import { FolderModalProvider } from "@/modules/client/files/provider/FolderModalProvider";
import type { TFileList } from "@/modules/entities/schemas/file";
import type { TFolderList } from "@/modules/entities/schemas/folder";

interface FilesPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ folder_id?: string }>;
}

const EMPTY_FILE_LIST: TFileList = {
  items: [],
  total: 0,
  limit: 200,
  offset: 0,
  has_more: false,
  next_cursor: null,
};

const EMPTY_FOLDER_LIST: TFolderList = { items: [], total: 0 };

export default async function FilesPage({ params, searchParams }: FilesPageProps) {
  const { projectId } = await params;
  const { folder_id: folderId } = await searchParams;

  const [filesResult, foldersResult, configResult] = await Promise.all([
    listFilesAction({
      payload: {
        projectId,
        limit: 200,
        ...(folderId ? { folder_id: folderId } : {}),
      },
    }),
    listFoldersAction({ payload: { projectId } }),
    getProjectConfigAction({ payload: { projectId } }),
  ]);

  const [filesData] = filesResult;
  const [foldersData] = foldersResult;
  const [configData] = configResult;

  const initialData = filesData ?? EMPTY_FILE_LIST;
  const folderList = foldersData ?? EMPTY_FOLDER_LIST;
  const projectConfig = configData ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Files</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {initialData.total} file{initialData.total !== 1 ? "s" : ""} in this project
        </p>
      </div>

      <div className="flex gap-6 items-start">
        <Suspense>
          <FolderTree
            folderList={folderList}
            activeFolderId={folderId ?? null}
            projectId={projectId}
          />
        </Suspense>

        <div className="flex-1 min-w-0">
          <FilesTable
            projectId={projectId}
            folderId={folderId ?? null}
            initialData={initialData}
          />
        </div>
      </div>

      <FileModalProvider projectId={projectId} folders={folderList} projectConfig={projectConfig} />
      <FolderModalProvider projectId={projectId} />
    </div>
  );
}
