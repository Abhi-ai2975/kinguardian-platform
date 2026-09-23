import {
  TRevokeSessionValidationSchema,
} from "@/modules/entities/schemas/admin/sessions/sessions.schema";

export interface ISessionsService {
  revokeUserSession(payload: TRevokeSessionValidationSchema): Promise<{ success: boolean }>;
}
