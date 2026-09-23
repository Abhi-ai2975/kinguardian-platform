/**
 * EMR Chat DI module.
 *
 * Layer: server / di / modules / emr-chat
 *
 * Registers EmrChatPrismaRepository with the IoC container under the
 * IEmrChatRepository symbol. Unlike REST services, this implementation always
 * uses Prisma — there is no transport switch.
 */

import { type Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { EmrChatPrismaRepository } from "@/modules/server/core/emr-chat/infrastructure/repositories/emr-chat.prisma.repository";

/**
 * Binds EmrChatPrismaRepository to its interface symbol in the container.
 *
 * @param container - The application IoC container.
 */
export function registerEmrChatModule(container: Container): void {
  container.bind(DI_SYMBOLS.IEmrChatRepository).toClass(EmrChatPrismaRepository);
}
