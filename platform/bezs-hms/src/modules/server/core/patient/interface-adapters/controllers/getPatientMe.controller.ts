/**
 * getPatientMeController — returns the caller's own Patient record.
 * Layer: interface-adapters / controllers
 */
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { getPatientMeUseCase } from "../../application/usecases/getPatientMe.usecase";

function presenter(data: TPatientResponse) { return data; }
export type TGetPatientMeControllerOutput = ReturnType<typeof presenter>;

export async function getPatientMeController(): Promise<TGetPatientMeControllerOutput> {
  return presenter(await getPatientMeUseCase());
}
