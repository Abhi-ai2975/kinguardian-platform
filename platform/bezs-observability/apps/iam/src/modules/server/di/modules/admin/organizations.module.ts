import { DI_SYMBOLS } from "../../types";
import { Container } from "@evyweb/ioctopus";
import { OrganizationsService } from "@/modules/server/core/admin/infrastructure/services/organizations.service";

export function registerOrganizationsModule(container: Container) {
  container.bind(DI_SYMBOLS.IOrganizationsService).toClass(OrganizationsService);
}
