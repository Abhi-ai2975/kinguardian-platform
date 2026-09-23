import { revokeAllSessionsUseCase } from "../../../application/usecases/sessions/revokeAllSessions.usecase";

function presenter(data: { success: boolean; count: number }) {
  return data;
}

export type TRevokeAllSessionsControllerOutput = ReturnType<typeof presenter>;

export async function revokeAllSessionsController(): Promise<TRevokeAllSessionsControllerOutput> {
  const data = await revokeAllSessionsUseCase();
  return presenter(data);
}
