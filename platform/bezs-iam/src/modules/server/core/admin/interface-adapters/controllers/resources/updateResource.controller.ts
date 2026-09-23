import {
  TResourceSchema,
  UpdateResourceValidationSchema,
} from "@/modules/entities/schemas/admin/resources/resources.schema";
import { updateResourceUseCase } from "../../../application/usecases/resources";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TResourceSchema) {
  return data;
}

export type TUpdateResourceControllerOutput = ReturnType<typeof presenter>;

export async function updateResourceController(
  input: unknown,
): Promise<TUpdateResourceControllerOutput> {
  const parsed = await UpdateResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await updateResourceUseCase(parsed.data);
  return presenter(data);
}
