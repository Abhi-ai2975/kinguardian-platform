/**
 * storage-config.module — DI registration for the storage config domain.
 *
 * @module
 */
import type { Container } from "@evyweb/ioctopus";
import { StorageConfigRestService } from "@/modules/server/core/storage-config/infrastructure/services/storage-config.rest.service";
import { DI_SYMBOLS } from "../../types";

export function registerStorageConfigModule(container: Container): void {
  container.bind(DI_SYMBOLS.IStorageConfigService).toClass(StorageConfigRestService);
}
