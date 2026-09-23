import {
  RegisterAgentValidationSchema,
  TRegisterAgentResponseDtoSchema,
} from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { registerAgentUseCase } from "../../../application/usecases/agent-auth";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TRegisterAgentResponseDtoSchema) {
  return data;
}

export type TRegisterAgentControllerOutput = ReturnType<typeof presenter>;

export async function registerAgentController(
  input: unknown,
): Promise<TRegisterAgentControllerOutput> {
  const parsed = await RegisterAgentValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await registerAgentUseCase(parsed.data);
  return presenter(data);
}
