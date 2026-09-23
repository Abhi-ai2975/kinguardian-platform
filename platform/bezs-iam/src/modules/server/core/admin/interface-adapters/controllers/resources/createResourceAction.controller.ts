import {
  TResourceActionSchema,
  CreateResourceActionValidationSchema,
} from "@/modules/entities/schemas/admin/resources/resources.schema";
import { createResourceActionUseCase } from "../../../application/usecases/resources";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TResourceActionSchema) {
  return data;
}

export type TCreateResourceActionControllerOutput = ReturnType<typeof presenter>;

export async function createResourceActionController(
  input: unknown,
): Promise<TCreateResourceActionControllerOutput> {
  const parsed =
    await CreateResourceActionValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await createResourceActionUseCase(parsed.data);
  return presenter(data);
}
