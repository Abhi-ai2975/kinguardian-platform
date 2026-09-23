import { DI_SYMBOLS } from "../../types";
import { Container } from "@evyweb/ioctopus";
import { UsersService } from "@/modules/server/core/admin/infrastructure/services/users.service";

export function registerUsersModule(container: Container) {
  container.bind(DI_SYMBOLS.IUsersService).toClass(UsersService);
}
