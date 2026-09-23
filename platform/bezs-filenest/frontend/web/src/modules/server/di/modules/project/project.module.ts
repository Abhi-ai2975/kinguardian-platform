/**
 * project.module — DI registration for the project domain.
 *
 * Layer: di / modules / project
 *
 * Binds IProjectService to ProjectRestService. To swap the implementation
 * (e.g. an in-memory stub for tests), change the binding here without
 * touching any use case or controller.
 *
 * @module
 */
import type { Container } from "@evyweb/ioctopus";
import { ProjectRestService } from "@/modules/server/core/project/infrastructure/services/project.rest.service";
import { DI_SYMBOLS } from "../../types";

/**
 * Registers the project module into the DI container.
 *
 * @param container - The ioctopus application container.
 */
export function registerProjectModule(container: Container): void {
  container.bind(DI_SYMBOLS.IProjectService).toClass(ProjectRestService);
}
