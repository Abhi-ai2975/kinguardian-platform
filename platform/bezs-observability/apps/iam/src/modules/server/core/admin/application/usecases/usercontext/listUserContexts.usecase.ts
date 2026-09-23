import { getInjection } from "@/modules/server/di/container";
import { TListUserContextsResponseSchema } from "@/modules/entities/schemas/admin/user-context/user-context.schema";

export async function listUserContextsUseCase(): Promise<TListUserContextsResponseSchema> {
  const service = getInjection("IUserContextService");
  return service.listUserContexts();
}
