import {
  TConsentSchema,
  UpdateConsentScopesValidationSchema,
} from "@/modules/entities/schemas/admin/consents/consents.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateConsentScopesUseCase } from "../../../application/usecases/consents/updateConsentScopes.usecase";

function presenter(data: TConsentSchema): TConsentSchema {
  return data;
}

export type TUpdateConsentScopesControllerOutput = ReturnType<typeof presenter>;

export async function updateConsentScopesController(
  input: unknown,
): Promise<TUpdateConsentScopesControllerOutput> {
  const parsed = await UpdateConsentScopesValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await updateConsentScopesUseCase(parsed.data);
  return presenter(data);
}
