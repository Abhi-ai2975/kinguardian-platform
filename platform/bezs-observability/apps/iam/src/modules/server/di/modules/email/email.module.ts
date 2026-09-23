import { Bind, ContainerModule } from "inversify"
import { DI_SYMBOLS } from "../../types"
import { IEmailService } from "@/modules/server/core/common/email/domain/interfaces/email.service.interface"
import { NodemailerEmailService } from "@/modules/server/core/common/email/infrastructure/services/nodemailerEmail.service"
import { Container } from "@evyweb/ioctopus"

// const initializeModules = ({ bind }: { bind: Bind }) => {
//   bind<IEmailService>(DI_SYMBOLS.IEmailService)
//     .to(NodemailerEmailService)
//     .inSingletonScope();
// };

// export const EmailModule = new ContainerModule(initializeModules);

export function registerEmailModule(container: Container) {
  container.bind(DI_SYMBOLS.IEmailService).toClass(NodemailerEmailService)
}
