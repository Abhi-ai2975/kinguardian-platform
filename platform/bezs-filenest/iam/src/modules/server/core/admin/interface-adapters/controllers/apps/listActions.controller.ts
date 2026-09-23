import {
  TListActionsResponseSchema,
  TResourceActionSchema,
} from "@/modules/entities/schemas/admin/apps/apps.schema";
import { listActionsUseCase } from "../../../application/usecases/apps/listActions.usecase";

function presenter(data: TListActionsResponseSchema): TResourceActionSchema[] {
  return data.actions;
}

export type TListActionsControllerOutput = ReturnType<typeof presenter>;

export async function listActionsController(): Promise<TListActionsControllerOutput> {
  const data = await listActionsUseCase();
  return presenter(data);
}
