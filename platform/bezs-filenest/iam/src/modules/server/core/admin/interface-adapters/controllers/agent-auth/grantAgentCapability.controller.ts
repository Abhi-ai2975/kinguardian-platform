import {
  GrantCapabilityValidationSchema,
  TGrantCapabilityResponseDtoSchema,
} from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { grantAgentCapabilityUseCase } from "../../../application/usecases/agent-auth";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TGrantCapabilityResponseDtoSchema) {
  return data;
}

export type TGrantAgentCapabilityControllerOutput = ReturnType<
  typeof presenter
>;

export async function grantAgentCapabilityController(
  input: unknown,
): Promise<TGrantAgentCapabilityControllerOutput> {
  const parsed = await GrantCapabilityValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await grantAgentCapabilityUseCase(parsed.data);
  return presenter(data);
}
