import {
  TListMenuNodesResponseSchema,
  TMenuNodeSchema,
} from "@/modules/entities/schemas/admin/apps/apps.schema";
import { listMenuNodesUseCase } from "../../../application/usecases/apps/listMenuNodes.usecase";

function presenter(data: TListMenuNodesResponseSchema): TMenuNodeSchema[] {
  return data.nodes;
}

export type TListMenuNodesControllerOutput = ReturnType<typeof presenter>;

export async function listMenuNodesController(
  appId: string,
): Promise<TListMenuNodesControllerOutput> {
  const data = await listMenuNodesUseCase(appId);
  return presenter(data);
}
