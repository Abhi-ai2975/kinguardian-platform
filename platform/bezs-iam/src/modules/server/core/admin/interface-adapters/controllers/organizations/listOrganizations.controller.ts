import { TOrganizationSummarySchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { listOrganizationsUseCase } from "../../../application/usecases/organizations/listOrganizations.usecase";

function presenter(data: { organizations: TOrganizationSummarySchema[] }): TOrganizationSummarySchema[] {
  return data.organizations;
}

export type TListOrganizationsControllerOutput = ReturnType<typeof presenter>;

export async function listOrganizationsController(): Promise<TListOrganizationsControllerOutput> {
  const data = await listOrganizationsUseCase();
  return presenter(data);
}
