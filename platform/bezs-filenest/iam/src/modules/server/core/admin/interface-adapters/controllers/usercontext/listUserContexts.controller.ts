import { listUserContextsUseCase } from "../../../application/usecases/usercontext/listUserContexts.usecase";
import { TListUserContextsResponseSchema } from "@/modules/entities/schemas/admin/user-context/user-context.schema";

function presenter(data: TListUserContextsResponseSchema) {
  return data.items;
}

export type TListUserContextsControllerOutput = ReturnType<typeof presenter>;

export async function listUserContextsController(): Promise<TListUserContextsControllerOutput> {
  const data = await listUserContextsUseCase();
  return presenter(data);
}
