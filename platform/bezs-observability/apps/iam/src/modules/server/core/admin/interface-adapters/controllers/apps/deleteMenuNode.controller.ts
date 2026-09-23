import { DeleteMenuNodeValidationSchema } from "@/modules/entities/schemas/admin/apps/apps.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deleteMenuNodeUseCase } from "../../../application/usecases/apps/deleteMenuNode.usecase";

function presenter(data: { success: true }): { success: true } {
  return data;
}

export type TDeleteMenuNodeControllerOutput = ReturnType<typeof presenter>;

export async function deleteMenuNodeController(
  input: unknown,
): Promise<TDeleteMenuNodeControllerOutput> {
  const parsed = await DeleteMenuNodeValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await deleteMenuNodeUseCase(parsed.data);
  return presenter(data);
}
