import { getInjection } from "@/modules/server/di/container";
import { TDeleteMenuNodeValidationSchema } from "@/modules/entities/schemas/admin/apps/apps.schema";

export async function deleteMenuNodeUseCase(
  payload: TDeleteMenuNodeValidationSchema,
): Promise<{ success: true }> {
  const service = getInjection("IAppsService");
  return await service.deleteMenuNode(payload);
}
