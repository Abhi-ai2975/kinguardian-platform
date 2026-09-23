import { TOrganizationDetailSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { getOrganizationUseCase } from "../../../application/usecases/organizations/getOrganization.usecase";

function presenter(data: TOrganizationDetailSchema): TOrganizationDetailSchema {
  return data;
}

export type TGetOrganizationControllerOutput = ReturnType<typeof presenter>;

export async function getOrganizationController(
  organizationId: string,
): Promise<TGetOrganizationControllerOutput> {
  const data = await getOrganizationUseCase(organizationId);
  return presenter(data);
}
