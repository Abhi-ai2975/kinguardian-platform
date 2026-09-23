import { DI_SYMBOLS } from "../../types";
import { Container } from "@evyweb/ioctopus";
import { UserContextRepository } from "@/modules/server/core/admin/infrastructure/repositories/usercontext.repository";

export function registerUserContextModule(container: Container) {
  container.bind(DI_SYMBOLS.IUserContextRepository).toClass(UserContextRepository);
}
