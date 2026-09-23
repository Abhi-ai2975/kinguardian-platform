/**
 * listPatientAddressesController — lists Address sub-resources for a Patient.
 * Layer: interface-adapters / controllers
 */
import { ListPatientSubResourceValidationSchema } from "@/modules/entities/schemas/patient";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listPatientAddressesUseCase } from "../../application/usecases/listPatientAddresses.usecase";

export type TListPatientAddressesControllerOutput = Awaited<ReturnType<typeof listPatientAddressesUseCase>>;

export async function listPatientAddressesController(input: unknown): Promise<TListPatientAddressesControllerOutput> {
  const parsed = await ListPatientSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return listPatientAddressesUseCase(parsed.data.patient_id);
}
