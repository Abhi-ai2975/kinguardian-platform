import { DI_SYMBOLS } from "../../types";
import { Container } from "@evyweb/ioctopus";
import { SessionsService } from "@/modules/server/core/admin/infrastructure/services/sessions.service";

export function registerSessionsModule(container: Container) {
  container.bind(DI_SYMBOLS.ISessionsService).toClass(SessionsService);
}
