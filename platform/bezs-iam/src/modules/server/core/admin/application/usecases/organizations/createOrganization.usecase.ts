import { getInjection } from "@/modules/server/di/container";
import {
  TCreateOrganizationValidationSchema,
  TOrganizationSummarySchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export async function createOrganizationUseCase(
  payload: TCreateOrganizationValidationSchema,
): Promise<TOrganizationSummarySchema> {
  const service = getInjection("IOrganizationsService");
  return service.createOrganization(payload);
}
