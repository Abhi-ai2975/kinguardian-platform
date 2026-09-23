/**
 * usage.module — DI registration for the usage domain.
 *
 * @module
 */
import type { Container } from "@evyweb/ioctopus";
import { UsageRestService } from "@/modules/server/core/usage/infrastructure/services/usage.rest.service";
import { DI_SYMBOLS } from "../../types";

export function registerUsageModule(container: Container): void {
  container.bind(DI_SYMBOLS.IUsageService).toClass(UsageRestService);
}
