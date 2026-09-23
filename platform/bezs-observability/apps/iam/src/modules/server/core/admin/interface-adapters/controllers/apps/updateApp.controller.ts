import {
  UpdateAppValidationSchema,
  TAppSchema,
} from "@/modules/entities/schemas/admin/apps/apps.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateAppUseCase } from "../../../application/usecases/apps/updateApp.usecase";

function presenter(data: TAppSchema): TAppSchema {
  return data;
}

export type TUpdateAppControllerOutput = ReturnType<typeof presenter>;

export async function updateAppController(input: unknown): Promise<TUpdateAppControllerOutput> {
  const parsed = await UpdateAppValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await updateAppUseCase(parsed.data);
  return presenter(data);
}
