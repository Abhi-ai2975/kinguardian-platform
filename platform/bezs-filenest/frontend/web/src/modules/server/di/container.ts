/**
 * server/di/container — application-level DI container.
 *
 * Builds a single ioctopus container at module load time and registers all
 * domain modules. Exposes getInjection() as the only public API — callers
 * receive fully typed instances without importing concrete classes.
 *
 * To add a new domain:
 *  1. Create di/modules/{domain}/{domain}.module.ts
 *  2. Export registerXxxModule from di/modules/index.ts
 *  3. Call registerXxxModule(ApplicationContainer) below
 *  4. Add the symbol + return type to di/types.ts
 *
 * @module
 */
import { createContainer } from "@evyweb/ioctopus";
import { DI_SYMBOLS, type DI_RETURN_TYPES } from "./types";
import {
  registerDashboardModule,
  registerProjectModule,
  registerStorageConfigModule,
  registerProjectConfigModule,
  registerApiKeyModule,
  registerFileModule,
  registerWebhookModule,
  registerFolderModule,
  registerUsageModule,
} from "./modules";

const ApplicationContainer = createContainer();

registerDashboardModule(ApplicationContainer);
registerProjectModule(ApplicationContainer);
registerStorageConfigModule(ApplicationContainer);
registerProjectConfigModule(ApplicationContainer);
registerApiKeyModule(ApplicationContainer);
registerFileModule(ApplicationContainer);
registerWebhookModule(ApplicationContainer);
registerFolderModule(ApplicationContainer);
registerUsageModule(ApplicationContainer);

export function getInjection<K extends keyof typeof DI_SYMBOLS>(
  symbol: K,
): DI_RETURN_TYPES[K] {
  return ApplicationContainer.get(DI_SYMBOLS[symbol]);
}
