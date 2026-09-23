/**
 * folder.service.interface — domain contract for folder API access.
 *
 * @module
 */
import type {
  TFolder,
  TFolderList,
  TFolderDeleteResponse,
  TCreateFolderParams,
} from "@/modules/entities/schemas/folder";

export interface IFolderService {
  list(projectId: string): Promise<TFolderList>;
  create(params: TCreateFolderParams): Promise<TFolder>;
  delete(projectId: string, folderId: string): Promise<TFolderDeleteResponse>;
}
