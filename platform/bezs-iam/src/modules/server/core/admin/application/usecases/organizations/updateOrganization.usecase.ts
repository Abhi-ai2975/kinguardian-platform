import { getInjection } from "@/modules/server/di/container";
import {
  TUpdateOrganizationValidationSchema,
  TOrganizationSummarySchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export async function updateOrganizationUseCase(
  payload: TUpdateOrganizationValidationSchema,
): Promise<TOrganizationSummarySchema> {
  const repository = getInjection("IOrganizationsRepository");
  return repository.updateOrganization(payload);
}
