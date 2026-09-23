import { TListResourceActionsResponseSchema } from "@/modules/entities/schemas/admin/resources/resources.schema";
import { listResourceActionsUseCase } from "../../../application/usecases/resources";

function presenter(data: TListResourceActionsResponseSchema) {
  return data.actions;
}

export type TListResourceActionsControllerOutput = ReturnType<typeof presenter>;

export async function listResourceActionsController(
  resourceId?: string,
): Promise<TListResourceActionsControllerOutput> {
  const data = await listResourceActionsUseCase(resourceId);
  return presenter(data);
}
