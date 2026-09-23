import { getUserOrgMembershipsUseCase } from "../../../application/usecases/usercontext/getUserOrgMemberships.usecase";
import { TGetUserOrgMembershipsResponseSchema } from "@/modules/entities/schemas/admin/user-context/user-context.schema";

function presenter(data: TGetUserOrgMembershipsResponseSchema) {
  return data.memberships;
}

export type TGetUserOrgMembershipsControllerOutput = ReturnType<typeof presenter>;

export async function getUserOrgMembershipsController(
  userId: string,
): Promise<TGetUserOrgMembershipsControllerOutput> {
  const data = await getUserOrgMembershipsUseCase(userId);
  return presenter(data);
}
