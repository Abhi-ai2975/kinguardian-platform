import { TGetAllSessionsResponseDtoSchema } from "@/modules/entities/schemas/admin/sessions/sessions.schema";
import { getInjection } from "@/modules/server/di/container";

export async function getAllSessionsUseCase(): Promise<TGetAllSessionsResponseDtoSchema> {
  const sessionsRepository = getInjection("ISessionsRepository");
  return await sessionsRepository.getAllSessions();
}
