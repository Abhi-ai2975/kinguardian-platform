import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { AppsService } from "@/modules/server/core/admin/infrastructure/services/apps.service";

export function registerAppsModule(container: Container) {
  container.bind(DI_SYMBOLS.IAppsService).toClass(AppsService);
}
