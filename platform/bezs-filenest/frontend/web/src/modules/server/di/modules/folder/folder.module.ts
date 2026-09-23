/**
 * folder.module — DI registration for the folder domain.
 *
 * @module
 */
import type { Container } from "@evyweb/ioctopus";
import { FolderRestService } from "@/modules/server/core/folder/infrastructure/services/folder.rest.service";
import { DI_SYMBOLS } from "../../types";

export function registerFolderModule(container: Container): void {
  container.bind(DI_SYMBOLS.IFolderService).toClass(FolderRestService);
}
