import { DI_SYMBOLS } from "../../types";
import { Container } from "@evyweb/ioctopus";
import { SessionsService } from "@/modules/server/core/admin/infrastructure/services/sessions.service";
import { SessionsRepository } from "@/modules/server/core/admin/infrastructure/repositories/sessions.repository";

export function registerSessionsModule(container: Container) {
  container.bind(DI_SYMBOLS.ISessionsService).toClass(SessionsService);
  container.bind(DI_SYMBOLS.ISessionsRepository).toClass(SessionsRepository);
}
