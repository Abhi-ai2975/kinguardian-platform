import { SetUserPasswordValidationSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { setUserPasswordUseCase } from "../../../application/usecases/users/setUserPassword.usecase";

function presenter(data: { status: boolean }) {
  return data;
}

export type TSetUserPasswordControllerOutput = ReturnType<typeof presenter>;

export async function setUserPasswordController(input: unknown): Promise<TSetUserPasswordControllerOutput> {
  const parsed = await SetUserPasswordValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await setUserPasswordUseCase(parsed.data);
  return presenter(data);
}
