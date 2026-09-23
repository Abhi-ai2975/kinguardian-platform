import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { ResourcesRepository } from "@/modules/server/core/admin/infrastructure/repositories/resources.repository";

export function registerResourcesModule(container: Container) {
  container.bind(DI_SYMBOLS.IResourcesRepository).toClass(ResourcesRepository);
}
