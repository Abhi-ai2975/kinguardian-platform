import { getInjection } from "@/modules/server/di/container";
import {
  TUpdateAppValidationSchema,
  TAppSchema,
} from "@/modules/entities/schemas/admin/apps/apps.schema";

export async function updateAppUseCase(payload: TUpdateAppValidationSchema): Promise<TAppSchema> {
  const repository = getInjection("IAppsRepository");
  return await repository.updateApp(payload);
}
