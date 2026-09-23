/**
 * file.module — DI registration for the file domain.
 *
 * Layer: di / modules / file
 *
 * Binds IFileService to FileRestService.
 *
 * @module
 */
import type { Container } from "@evyweb/ioctopus";
import { FileRestService } from "@/modules/server/core/file/infrastructure/services/file.rest.service";
import { DI_SYMBOLS } from "../../types";

/**
 * Registers the file module into the DI container.
 *
 * @param container - The ioctopus application container.
 */
export function registerFileModule(container: Container): void {
  container.bind(DI_SYMBOLS.IFileService).toClass(FileRestService);
}
