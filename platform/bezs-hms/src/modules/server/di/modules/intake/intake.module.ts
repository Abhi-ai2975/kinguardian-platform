/**
 * Intake DI module.
 *
 * Layer: server / di / modules / intake
 *
 * Registers IntakePrismaRepository with the IoC container under the
 * IIntakeRepository symbol. Uses Prisma directly — no REST transport.
 */

import { type Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { IntakePrismaRepository } from "@/modules/server/core/intake/infrastructure/repositories/intake.prisma.repository";

/**
 * Binds IntakePrismaRepository to its interface symbol in the container.
 *
 * @param container - The application IoC container.
 */
export function registerIntakeModule(container: Container): void {
  container.bind(DI_SYMBOLS.IIntakeRepository).toClass(IntakePrismaRepository);
}
