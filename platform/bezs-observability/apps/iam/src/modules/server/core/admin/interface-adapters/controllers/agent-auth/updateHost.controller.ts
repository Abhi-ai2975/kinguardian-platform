import {
  UpdateHostValidationSchema,
  TUpdateHostResponseDtoSchema,
} from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { updateHostUseCase } from "../../../application/usecases/agent-auth";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TUpdateHostResponseDtoSchema) {
  return data;
}

export type TUpdateHostControllerOutput = ReturnType<typeof presenter>;

export async function updateHostController(
  input: unknown,
): Promise<TUpdateHostControllerOutput> {
  const parsed = await UpdateHostValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await updateHostUseCase(parsed.data);
  return presenter(data);
}
