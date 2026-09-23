import {
  CreateMenuNodeValidationSchema,
  TMenuNodeSchema,
} from "@/modules/entities/schemas/admin/apps/apps.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createMenuNodeUseCase } from "../../../application/usecases/apps/createMenuNode.usecase";

function presenter(data: TMenuNodeSchema): TMenuNodeSchema {
  return data;
}

export type TCreateMenuNodeControllerOutput = ReturnType<typeof presenter>;

export async function createMenuNodeController(
  input: unknown,
): Promise<TCreateMenuNodeControllerOutput> {
  const parsed = await CreateMenuNodeValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createMenuNodeUseCase(parsed.data);
  return presenter(data);
}
