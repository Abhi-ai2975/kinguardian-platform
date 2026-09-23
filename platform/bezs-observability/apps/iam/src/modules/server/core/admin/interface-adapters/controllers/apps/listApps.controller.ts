import {
  TListAppsResponseSchema,
  TAppSchema,
} from "@/modules/entities/schemas/admin/apps/apps.schema";
import { listAppsUseCase } from "../../../application/usecases/apps/listApps.usecase";

function presenter(data: TListAppsResponseSchema): TAppSchema[] {
  return data.apps;
}

export type TListAppsControllerOutput = ReturnType<typeof presenter>;

export async function listAppsController(): Promise<TListAppsControllerOutput> {
  const data = await listAppsUseCase();
  return presenter(data);
}
