/**
 * listPatientPhotosController — lists Photo sub-resources for a Patient.
 * Layer: interface-adapters / controllers
 */
import { ListPatientSubResourceValidationSchema } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listPatientPhotosUseCase } from "../../application/usecases/listPatientPhotos.usecase";

export type TListPatientPhotosControllerOutput = Awaited<ReturnType<typeof listPatientPhotosUseCase>>;

export async function listPatientPhotosController(input: unknown): Promise<TListPatientPhotosControllerOutput> {
  const parsed = await ListPatientSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return listPatientPhotosUseCase(parsed.data.patient_id);
}
