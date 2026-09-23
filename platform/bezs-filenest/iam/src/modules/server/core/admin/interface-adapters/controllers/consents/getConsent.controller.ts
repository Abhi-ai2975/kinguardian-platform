import {
  TConsentSchema,
  GetConsentValidationSchema,
} from "@/modules/entities/schemas/admin/consents/consents.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getConsentUseCase } from "../../../application/usecases/consents/getConsent.usecase";

function presenter(data: TConsentSchema): TConsentSchema {
  return data;
}

export type TGetConsentControllerOutput = ReturnType<typeof presenter>;

export async function getConsentController(
  input: unknown,
): Promise<TGetConsentControllerOutput> {
  const parsed = await GetConsentValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getConsentUseCase(parsed.data);
  return presenter(data);
}
