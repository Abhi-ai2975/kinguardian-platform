import {
  CreateOrganizationValidationSchema,
  TOrganizationSummarySchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createOrganizationUseCase } from "../../../application/usecases/organizations/createOrganization.usecase";

function presenter(
  data: TOrganizationSummarySchema,
): TOrganizationSummarySchema {
  return data;
}

export type TCreateOrganizationControllerOutput = ReturnType<typeof presenter>;

export async function createOrganizationController(
  input: unknown,
): Promise<TCreateOrganizationControllerOutput> {
  const parsed = await CreateOrganizationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createOrganizationUseCase(parsed.data);
  return presenter(data);
}
