import {
  UpdateOrganizationValidationSchema,
  TOrganizationSummarySchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateOrganizationUseCase } from "../../../application/usecases/organizations/updateOrganization.usecase";

function presenter(data: TOrganizationSummarySchema): TOrganizationSummarySchema {
  return data;
}

export type TUpdateOrganizationControllerOutput = ReturnType<typeof presenter>;

export async function updateOrganizationController(
  input: unknown,
): Promise<TUpdateOrganizationControllerOutput> {
  const parsed = await UpdateOrganizationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await updateOrganizationUseCase(parsed.data);
  return presenter(data);
}
