import { getInjection } from "@/modules/server/di/container";
import {
  TUpdateAppValidationSchema,
  TAppSchema,
} from "@/modules/entities/schemas/admin/apps/apps.schema";

export async function updateAppUseCase(payload: TUpdateAppValidationSchema): Promise<TAppSchema> {
  const service = getInjection("IAppsService");
  return await service.updateApp(payload);
}
