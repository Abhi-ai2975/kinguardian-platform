import { TGetAllSessionsResponseDtoSchema } from "@/modules/entities/schemas/admin/sessions/sessions.schema";
import { getInjection } from "@/modules/server/di/container";

export async function getAllSessionsUseCase(): Promise<TGetAllSessionsResponseDtoSchema> {
  const sessionsService = getInjection("ISessionsService");
  return await sessionsService.getAllSessions();
}
