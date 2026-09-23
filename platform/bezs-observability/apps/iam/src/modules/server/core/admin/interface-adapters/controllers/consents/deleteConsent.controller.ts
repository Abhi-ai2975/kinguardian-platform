import { DeleteConsentValidationSchema } from "@/modules/entities/schemas/admin/consents/consents.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deleteConsentUseCase } from "../../../application/usecases/consents/deleteConsent.usecase";

function presenter(data: { success: boolean }) {
  return data;
}

export type TDeleteConsentControllerOutput = ReturnType<typeof presenter>;

export async function deleteConsentController(
  input: unknown,
): Promise<TDeleteConsentControllerOutput> {
  const parsed = await DeleteConsentValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await deleteConsentUseCase(parsed.data);
  return presenter(data);
}
