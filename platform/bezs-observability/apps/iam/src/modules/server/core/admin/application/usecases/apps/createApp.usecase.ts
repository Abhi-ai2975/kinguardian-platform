import { getInjection } from "@/modules/server/di/container";
import {
  TCreateAppValidationSchema,
  TAppSchema,
} from "@/modules/entities/schemas/admin/apps/apps.schema";

export async function createAppUseCase(payload: TCreateAppValidationSchema): Promise<TAppSchema> {
  const service = getInjection("IAppsService");
  return await service.createApp(payload);
}
