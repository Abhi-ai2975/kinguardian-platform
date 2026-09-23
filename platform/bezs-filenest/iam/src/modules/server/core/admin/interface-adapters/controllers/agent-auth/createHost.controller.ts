import {
  CreateHostValidationSchema,
  TCreateHostResponseDtoSchema,
} from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { createHostUseCase } from "../../../application/usecases/agent-auth";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TCreateHostResponseDtoSchema) {
  return data;
}

export type TCreateHostControllerOutput = ReturnType<typeof presenter>;

export async function createHostController(
  input: unknown,
): Promise<TCreateHostControllerOutput> {
  const parsed = await CreateHostValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await createHostUseCase(parsed.data);
  return presenter(data);
}
