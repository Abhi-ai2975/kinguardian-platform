import {
  DeleteResourceValidationSchema,
} from "@/modules/entities/schemas/admin/resources/resources.schema";
import { deleteResourceUseCase } from "../../../application/usecases/resources";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: { success: boolean }) {
  return data;
}

export type TDeleteResourceControllerOutput = ReturnType<typeof presenter>;

export async function deleteResourceController(
  input: unknown,
): Promise<TDeleteResourceControllerOutput> {
  const parsed = await DeleteResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await deleteResourceUseCase(parsed.data);
  return presenter(data);
}
