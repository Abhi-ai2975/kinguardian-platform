import { getInjection } from "@/modules/server/di/container";
import {
  TUpdateMenuNodeValidationSchema,
  TMenuNodeSchema,
} from "@/modules/entities/schemas/admin/apps/apps.schema";

export async function updateMenuNodeUseCase(
  payload: TUpdateMenuNodeValidationSchema,
): Promise<TMenuNodeSchema> {
  const service = getInjection("IAppsService");
  return await service.updateMenuNode(payload);
}
