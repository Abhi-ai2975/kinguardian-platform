import { DeleteAppValidationSchema } from "@/modules/entities/schemas/admin/apps/apps.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deleteAppUseCase } from "../../../application/usecases/apps/deleteApp.usecase";

function presenter(data: { success: boolean }): { success: boolean } {
  return data;
}

export type TDeleteAppControllerOutput = ReturnType<typeof presenter>;

export async function deleteAppController(
  input: unknown,
): Promise<TDeleteAppControllerOutput> {
  const parsed = await DeleteAppValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await deleteAppUseCase(parsed.data);
  return presenter(data);
}
