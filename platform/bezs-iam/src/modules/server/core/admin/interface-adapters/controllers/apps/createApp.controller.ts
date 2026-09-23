import {
  CreateAppValidationSchema,
  TAppSchema,
} from "@/modules/entities/schemas/admin/apps/apps.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createAppUseCase } from "../../../application/usecases/apps/createApp.usecase";

function presenter(data: TAppSchema): TAppSchema {
  return data;
}

export type TCreateAppControllerOutput = ReturnType<typeof presenter>;

export async function createAppController(input: unknown): Promise<TCreateAppControllerOutput> {
  const parsed = await CreateAppValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createAppUseCase(parsed.data);
  return presenter(data);
}
