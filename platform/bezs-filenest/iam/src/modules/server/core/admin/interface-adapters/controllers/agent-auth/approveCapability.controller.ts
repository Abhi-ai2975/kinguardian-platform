import { ApproveCapabilityValidationSchema } from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { approveCapabilityUseCase } from "../../../application/usecases/agent-auth";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: { success: boolean }) {
  return data;
}

export type TApproveCapabilityControllerOutput = ReturnType<typeof presenter>;

export async function approveCapabilityController(
  input: unknown,
): Promise<TApproveCapabilityControllerOutput> {
  const parsed = await ApproveCapabilityValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await approveCapabilityUseCase(parsed.data);
  return presenter(data);
}
