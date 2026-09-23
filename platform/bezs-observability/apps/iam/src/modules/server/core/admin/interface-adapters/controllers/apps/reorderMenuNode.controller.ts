import { ReorderMenuNodeValidationSchema } from "@/modules/entities/schemas/admin/apps/apps.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { reorderMenuNodeUseCase } from "../../../application/usecases/apps/reorderMenuNode.usecase";

function presenter(data: { success: boolean }): { success: boolean } {
  return data;
}

export type TReorderMenuNodeControllerOutput = ReturnType<typeof presenter>;

export async function reorderMenuNodeController(
  input: unknown,
): Promise<TReorderMenuNodeControllerOutput> {
  const parsed = await ReorderMenuNodeValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await reorderMenuNodeUseCase(parsed.data);
  return presenter(data);
}
