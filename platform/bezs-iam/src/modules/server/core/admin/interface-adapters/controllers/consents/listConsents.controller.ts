import { TConsentSchema } from "@/modules/entities/schemas/admin/consents/consents.schema";
import { listConsentsUseCase } from "../../../application/usecases/consents/listConsents.usecase";

function presenter(data: TConsentSchema[]): TConsentSchema[] {
  return data;
}

export type TListConsentsControllerOutput = ReturnType<typeof presenter>;

export async function listConsentsController(): Promise<TListConsentsControllerOutput> {
  const data = await listConsentsUseCase();
  return presenter(data);
}
