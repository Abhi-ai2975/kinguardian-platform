import {
  TGetAllSessionsResponseDtoSchema,
  TRevokeSessionValidationSchema,
} from "@/modules/entities/schemas/admin/sessions/sessions.schema";

export interface ISessionsService {
  getAllSessions(): Promise<TGetAllSessionsResponseDtoSchema>;
  revokeUserSession(payload: TRevokeSessionValidationSchema): Promise<{ success: boolean }>;
  revokeAllSessions(): Promise<{ success: boolean; count: number }>;
}
