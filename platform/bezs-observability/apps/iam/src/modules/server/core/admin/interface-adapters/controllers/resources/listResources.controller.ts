import { TListResourcesResponseSchema } from "@/modules/entities/schemas/admin/resources/resources.schema";
import { listResourcesUseCase } from "../../../application/usecases/resources";

function presenter(data: TListResourcesResponseSchema) {
  return data.resources;
}

export type TListResourcesControllerOutput = ReturnType<typeof presenter>;

export async function listResourcesController(): Promise<TListResourcesControllerOutput> {
  const data = await listResourcesUseCase();
  return presenter(data);
}
