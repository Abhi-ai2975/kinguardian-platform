import {
  TResourceSchema,
  CreateResourceValidationSchema,
} from "@/modules/entities/schemas/admin/resources/resources.schema";
import { createResourceUseCase } from "../../../application/usecases/resources";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TResourceSchema) {
  return data;
}

export type TCreateResourceControllerOutput = ReturnType<typeof presenter>;

export async function createResourceController(
  input: unknown,
): Promise<TCreateResourceControllerOutput> {
  const parsed = await CreateResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await createResourceUseCase(parsed.data);
  return presenter(data);
}
