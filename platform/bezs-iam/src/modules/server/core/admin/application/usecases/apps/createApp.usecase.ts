import { getInjection } from "@/modules/server/di/container";
import {
  TCreateAppValidationSchema,
  TAppSchema,
} from "@/modules/entities/schemas/admin/apps/apps.schema";

export async function createAppUseCase(payload: TCreateAppValidationSchema): Promise<TAppSchema> {
  const repository = getInjection("IAppsRepository");
  return await repository.createApp(payload);
}
