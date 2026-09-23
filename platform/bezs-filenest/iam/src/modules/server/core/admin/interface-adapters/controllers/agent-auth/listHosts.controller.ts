import { TListHostsResponseDtoSchema } from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { listHostsUseCase } from "../../../application/usecases/agent-auth";

function presenter(data: TListHostsResponseDtoSchema) {
  return data.hosts;
}

export type TListHostsControllerOutput = ReturnType<typeof presenter>;

export async function listHostsController(): Promise<TListHostsControllerOutput> {
  const data = await listHostsUseCase();
  return presenter(data);
}
