import { DI_SYMBOLS } from "../../types"
import { AuthService } from "@/modules/server/core/auth/infrastructure/services/auth.service"
import { Container } from "@evyweb/ioctopus"

export function registerAuthModule(container: Container) {
  container.bind(DI_SYMBOLS.IAuthService).toClass(AuthService)
}
