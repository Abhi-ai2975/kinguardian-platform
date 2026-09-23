import { getInjection } from "@/modules/server/di/container";
import { TDeleteAppValidationSchema } from "@/modules/entities/schemas/admin/apps/apps.schema";

export async function deleteAppUseCase(
  payload: TDeleteAppValidationSchema,
): Promise<{ success: boolean }> {
  const repository = getInjection("IAppsRepository");
  return await repository.deleteApp(payload);
}
