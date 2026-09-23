import { TOrgRoleSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { listOrgRolesUseCase } from "../../../application/usecases/organizations/listOrgRoles.usecase";

function presenter(data: { roles: TOrgRoleSchema[] }): TOrgRoleSchema[] {
  return data.roles;
}

export type TListOrgRolesControllerOutput = ReturnType<typeof presenter>;

export async function listOrgRolesController(
  organizationId: string,
): Promise<TListOrgRolesControllerOutput> {
  const data = await listOrgRolesUseCase(organizationId);
  return presenter(data);
}
