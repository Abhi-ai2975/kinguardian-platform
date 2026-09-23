/**
 * project-config.module — DI registration for the project config domain.
 *
 * @module
 */
import type { Container } from "@evyweb/ioctopus";
import { ProjectConfigRestService } from "@/modules/server/core/project-config/infrastructure/services/project-config.rest.service";
import { DI_SYMBOLS } from "../../types";

export function registerProjectConfigModule(container: Container): void {
  container.bind(DI_SYMBOLS.IProjectConfigService).toClass(ProjectConfigRestService);
}
