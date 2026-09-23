import { Bind, ContainerModule } from "inversify"
import { DI_SYMBOLS } from "../../types"
import { IAuthService } from "@/modules/server/core/auth/domain/interfaces/auth.service.interface"
import { AuthService } from "@/modules/server/core/auth/infrastructure/services/auth.service"
import { Container } from "@evyweb/ioctopus"

// const initializeModules = ({ bind }: { bind: Bind }) => {
//   bind<IAuthService>(DI_SYMBOLS.IAuthService)
//     .to(AuthService)
//     .inSingletonScope();
// };

// export const AuthModule = new ContainerModule(initializeModules);

export function registerAuthModule(container: Container) {
  container.bind(DI_SYMBOLS.IAuthService).toClass(AuthService)
}
