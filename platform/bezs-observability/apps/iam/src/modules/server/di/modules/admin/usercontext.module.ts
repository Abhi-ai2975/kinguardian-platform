import { DI_SYMBOLS } from "../../types";
import { Container } from "@evyweb/ioctopus";
import { UserContextService } from "@/modules/server/core/admin/infrastructure/services/usercontext.service";

export function registerUserContextModule(container: Container) {
  container.bind(DI_SYMBOLS.IUserContextService).toClass(UserContextService);
}
