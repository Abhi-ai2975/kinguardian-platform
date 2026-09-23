import {
  UpdateMenuNodeValidationSchema,
  TMenuNodeSchema,
} from "@/modules/entities/schemas/admin/apps/apps.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateMenuNodeUseCase } from "../../../application/usecases/apps/updateMenuNode.usecase";

function presenter(data: TMenuNodeSchema): TMenuNodeSchema {
  return data;
}

export type TUpdateMenuNodeControllerOutput = ReturnType<typeof presenter>;

export async function updateMenuNodeController(
  input: unknown,
): Promise<TUpdateMenuNodeControllerOutput> {
  const parsed = await UpdateMenuNodeValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await updateMenuNodeUseCase(parsed.data);
  return presenter(data);
}
