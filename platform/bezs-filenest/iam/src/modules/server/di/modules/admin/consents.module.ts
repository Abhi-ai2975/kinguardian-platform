import { DI_SYMBOLS } from "../../types";
import { Container } from "@evyweb/ioctopus";
import { ConsentsService } from "@/modules/server/core/admin/infrastructure/services/consents.service";

export function registerConsentsModule(container: Container) {
  container.bind(DI_SYMBOLS.IConsentsService).toClass(ConsentsService);
}
