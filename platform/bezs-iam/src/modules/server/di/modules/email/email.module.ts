import { DI_SYMBOLS } from "../../types"
import { NodemailerEmailService } from "@/modules/server/core/common/email/infrastructure/services/nodemailerEmail.service"
import { Container } from "@evyweb/ioctopus"

export function registerEmailModule(container: Container) {
  container.bind(DI_SYMBOLS.IEmailService).toClass(NodemailerEmailService)
}
