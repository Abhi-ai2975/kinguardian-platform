import { getInjection } from "@/modules/server/di/container";
import {
  TCreateMenuNodeValidationSchema,
  TMenuNodeSchema,
} from "@/modules/entities/schemas/admin/apps/apps.schema";

export async function createMenuNodeUseCase(
  payload: TCreateMenuNodeValidationSchema,
): Promise<TMenuNodeSchema> {
  const repository = getInjection("IAppsRepository");
  return await repository.createMenuNode(payload);
}
