import {
  UpdateAgentValidationSchema,
  TUpdateAgentResponseDtoSchema,
} from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { updateAgentUseCase } from "../../../application/usecases/agent-auth";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TUpdateAgentResponseDtoSchema) {
  return data;
}

export type TUpdateAgentControllerOutput = ReturnType<typeof presenter>;

export async function updateAgentController(
  input: unknown,
): Promise<TUpdateAgentControllerOutput> {
  const parsed = await UpdateAgentValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await updateAgentUseCase(parsed.data);
  return presenter(data);
}
