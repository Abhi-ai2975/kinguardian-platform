/**
 * Patient address sub-resource server actions — add, list, patch, delete.
 *
 * Layer: presentation / actions
 * Resource: Patient (FHIR R4) — /addresses sub-resource
 *
 * All actions use authenticatedProcedure. Mutating actions include
 * transportOptions for cache revalidation; list does not.
 */

"use server";

import {
  AddPatientAddressActionSchema,
  DeletePatientAddressActionSchema,
  ListPatientAddressesActionSchema,
  PatchPatientAddressActionSchema,
  type TAddPatientAddressAction,
  type TDeletePatientAddressAction,
  type TListPatientAddressesAction,
  type TPatchPatientAddressAction,
} from "@/modules/entities/schemas/patient";
import {
  addPatientAddressController,
  deletePatientAddressController,
  listPatientAddressesController,
  patchPatientAddressController,
  type TAddPatientAddressControllerOutput,
  type TDeletePatientAddressControllerOutput,
  type TListPatientAddressesControllerOutput,
  type TPatchPatientAddressControllerOutput,
} from "@/modules/server/core/patient/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/** Adds an Address to a Patient. */
export const addPatientAddressAction = authenticatedProcedure
  .createServerAction()
  .input(AddPatientAddressActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TAddPatientAddressAction }) => {
    return await runWithTransport<TAddPatientAddressControllerOutput>(async () => {
      const data = await addPatientAddressController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists all Addresses for a Patient. */
export const listPatientAddressesAction = authenticatedProcedure
  .createServerAction()
  .input(ListPatientAddressesActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPatientAddressesAction }) => {
    return await runWithTransport<TListPatientAddressesControllerOutput>(async () => {
      const data = await listPatientAddressesController(input.payload);
      return { result: data };
    });
  });

/** Updates a specific Address on a Patient. */
export const patchPatientAddressAction = authenticatedProcedure
  .createServerAction()
  .input(PatchPatientAddressActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TPatchPatientAddressAction }) => {
    return await runWithTransport<TPatchPatientAddressControllerOutput>(async () => {
      const data = await patchPatientAddressController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Removes a specific Address from a Patient. */
export const deletePatientAddressAction = authenticatedProcedure
  .createServerAction()
  .input(DeletePatientAddressActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePatientAddressAction }) => {
    return await runWithTransport<TDeletePatientAddressControllerOutput>(async () => {
      const data = await deletePatientAddressController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
