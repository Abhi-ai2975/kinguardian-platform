import { getInjection } from "@/modules/server/di/container";
import { TReorderMenuNodeValidationSchema } from "@/modules/entities/schemas/admin/apps/apps.schema";

export async function reorderMenuNodeUseCase(
  payload: TReorderMenuNodeValidationSchema,
): Promise<{ success: boolean }> {
  const service = getInjection("IAppsService");
  return await service.reorderMenuNode(payload);
}
