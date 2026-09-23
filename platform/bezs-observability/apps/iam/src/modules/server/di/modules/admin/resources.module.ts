import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { ResourcesService } from "@/modules/server/core/admin/infrastructure/services/resources.service";

export function registerResourcesModule(container: Container) {
  container.bind(DI_SYMBOLS.IResourcesService).toClass(ResourcesService);
}
