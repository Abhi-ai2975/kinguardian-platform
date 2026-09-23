import { getInjection } from "@/modules/server/di/container";
import { TListConsentsResponseSchema } from "@/modules/entities/schemas/admin/consents/consents.schema";

export async function listConsentsUseCase(): Promise<TListConsentsResponseSchema> {
  const service = getInjection("IConsentsService");
  return service.listConsents();
}
