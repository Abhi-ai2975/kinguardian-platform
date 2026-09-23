import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { AppsRepository } from "@/modules/server/core/admin/infrastructure/repositories/apps.repository";

export function registerAppsModule(container: Container) {
  container.bind(DI_SYMBOLS.IAppsRepository).toClass(AppsRepository);
}
