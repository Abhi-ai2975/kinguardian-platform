/**
 * AiConsultation DI module.
 *
 * Layer: server / di / modules / ai-consultation
 *
 * Registers AiConsultationPrismaRepository with the IoC container under the
 * IAiConsultationRepository symbol. Uses Prisma directly — no REST transport.
 */

import { type Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { AiConsultationPrismaRepository } from "@/modules/server/core/ai-consultation/infrastructure/repositories/ai-consultation.prisma.repository";

/**
 * Binds AiConsultationPrismaRepository to its interface symbol in the container.
 *
 * @param container - The application IoC container.
 */
export function registerAiConsultationModule(container: Container): void {
  container
    .bind(DI_SYMBOLS.IAiConsultationRepository)
    .toClass(AiConsultationPrismaRepository);
}
