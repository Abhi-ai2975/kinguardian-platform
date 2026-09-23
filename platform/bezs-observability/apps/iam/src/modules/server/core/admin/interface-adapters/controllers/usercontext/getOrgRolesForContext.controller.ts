import { getOrgRolesForContextUseCase } from "../../../application/usecases/usercontext/getOrgRolesForContext.usecase";
import { TGetOrgRolesForContextResponseSchema } from "@/modules/entities/schemas/admin/user-context/user-context.schema";

function presenter(data: TGetOrgRolesForContextResponseSchema) {
  return data.roles;
}

export type TGetOrgRolesForContextControllerOutput = ReturnType<typeof presenter>;

export async function getOrgRolesForContextController(
  organizationId: string,
): Promise<TGetOrgRolesForContextControllerOutput> {
  const data = await getOrgRolesForContextUseCase(organizationId);
  return presenter(data);
}
