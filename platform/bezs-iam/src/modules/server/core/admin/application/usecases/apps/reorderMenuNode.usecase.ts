import { getInjection } from "@/modules/server/di/container";
import { TReorderMenuNodeValidationSchema } from "@/modules/entities/schemas/admin/apps/apps.schema";

export async function reorderMenuNodeUseCase(
  payload: TReorderMenuNodeValidationSchema,
): Promise<{ success: boolean }> {
  const repository = getInjection("IAppsRepository");
  return await repository.reorderMenuNode(payload);
}
