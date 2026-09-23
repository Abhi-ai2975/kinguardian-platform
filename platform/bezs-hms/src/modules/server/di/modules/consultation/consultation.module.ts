/**
 * Consultation DI module.
 *
 * Layer: server / di / modules / consultation
 *
 * Registers ConsultationPrismaRepository with the IoC container under the
 * IConsultationRepository symbol. Uses Prisma directly — no REST transport.
 */

import { type Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { ConsultationPrismaRepository } from "@/modules/server/core/consultation/infrastructure/repositories/consultation.prisma.repository";

/**
 * Binds ConsultationPrismaRepository to its interface symbol in the container.
 *
 * @param container - The application IoC container.
 */
export function registerConsultationModule(container: Container): void {
  container
    .bind(DI_SYMBOLS.IConsultationRepository)
    .toClass(ConsultationPrismaRepository);
}
