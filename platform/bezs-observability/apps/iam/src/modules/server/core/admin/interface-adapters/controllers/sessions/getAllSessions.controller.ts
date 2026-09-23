import { TSessionWithUserSchema } from "@/modules/entities/schemas/admin/sessions/sessions.schema";
import { getAllSessionsUseCase } from "../../../application/usecases/sessions/getAllSessions.usecase";

function presenter(data: { sessions: TSessionWithUserSchema[] }): TSessionWithUserSchema[] {
  return data.sessions;
}

export type TGetAllSessionsControllerOutput = ReturnType<typeof presenter>;

export async function getAllSessionsController(): Promise<TGetAllSessionsControllerOutput> {
  const data = await getAllSessionsUseCase();
  return presenter(data);
}
