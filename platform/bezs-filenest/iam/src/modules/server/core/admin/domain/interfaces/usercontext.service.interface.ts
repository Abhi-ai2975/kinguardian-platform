import {
  TListUserContextsResponseSchema,
  TGetUserOrgMembershipsResponseSchema,
  TGetOrgRolesForContextResponseSchema,
  TSetUserContextValidationSchema,
} from "@/modules/entities/schemas/admin/user-context/user-context.schema";

export interface IUserContextService {
  listUserContexts(): Promise<TListUserContextsResponseSchema>;
  getUserOrgMemberships(userId: string): Promise<TGetUserOrgMembershipsResponseSchema>;
  getOrgRolesForContext(organizationId: string): Promise<TGetOrgRolesForContextResponseSchema>;
  setUserContext(payload: TSetUserContextValidationSchema): Promise<{ success: boolean }>;
}
