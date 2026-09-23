import {
  TGetAllSessionsResponseDtoSchema,
} from "@/modules/entities/schemas/admin/sessions/sessions.schema";

export interface ISessionsRepository {
  getAllSessions(): Promise<TGetAllSessionsResponseDtoSchema>;
  revokeAllSessions(): Promise<{ success: boolean; count: number }>;
}
