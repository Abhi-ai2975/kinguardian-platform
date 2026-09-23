import { DeleteResourceActionValidationSchema } from "@/modules/entities/schemas/admin/resources/resources.schema";
import { deleteResourceActionUseCase } from "../../../application/usecases/resources";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: { success: boolean }) {
  return data;
}

export type TDeleteResourceActionControllerOutput = ReturnType<
  typeof presenter
>;

export async function deleteResourceActionController(
  input: unknown,
): Promise<TDeleteResourceActionControllerOutput> {
  const parsed =
    await DeleteResourceActionValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await deleteResourceActionUseCase(parsed.data);
  return presenter(data);
}
