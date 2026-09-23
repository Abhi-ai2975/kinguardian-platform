/**
 * createHealthcareServiceUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: create a new HealthcareService
 *
 * Delegates to IHealthcareServicesService via the DI container.
 * Contains no business logic — validation is the controller's responsibility.
 */

import {
  TCreateHealthcareService,
  THealthcareServiceResponse,
} from "@/modules/entities/schemas/healthcare-service";
import { getInjection } from "@/modules/server/di/container";

/**
 * Creates a new healthcare service via the injected HealthcareServicesService.
 *
 * @param dto - Validated creation payload.
 * @returns The newly created healthcare service record.
 * @throws ValidationError | UnauthorizedError | BadGatewayError
 */
export async function createHealthcareServiceUseCase(
  dto: TCreateHealthcareService
): Promise<THealthcareServiceResponse> {
  const service = getInjection("IHealthcareServicesService");
  return service.create(dto);
}
