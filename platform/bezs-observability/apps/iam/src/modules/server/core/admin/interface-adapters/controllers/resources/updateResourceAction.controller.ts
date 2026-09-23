import {
  TResourceActionSchema,
  UpdateResourceActionValidationSchema,
} from "@/modules/entities/schemas/admin/resources/resources.schema";
import { updateResourceActionUseCase } from "../../../application/usecases/resources";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TResourceActionSchema) {
  return data;
}

export type TUpdateResourceActionControllerOutput = ReturnType<typeof presenter>;

export async function updateResourceActionController(
  input: unknown,
): Promise<TUpdateResourceActionControllerOutput> {
  const parsed =
    await UpdateResourceActionValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await updateResourceActionUseCase(parsed.data);
  return presenter(data);
}
