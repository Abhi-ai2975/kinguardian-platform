/**
 * Patient general-practitioner sub-resource server actions — add, list, patch, delete.
 *
 * Layer: presentation / actions
 * Resource: Patient (FHIR R4) — /general-practitioners sub-resource
 *
 * All actions use authenticatedProcedure. Mutating actions include
 * transportOptions for cache revalidation; list does not.
 */

"use server";

import {
  AddPatientGPActionSchema,
  DeletePatientGPActionSchema,
  ListPatientGPsActionSchema,
  PatchPatientGPActionSchema,
  type TAddPatientGPAction,
  type TDeletePatientGPAction,
  type TListPatientGPsAction,
  type TPatchPatientGPAction,
} from "@/modules/entities/schemas/patient";
import {
  addPatientGeneralPractitionerController,
  deletePatientGeneralPractitionerController,
  listPatientGeneralPractitionersController,
  patchPatientGeneralPractitionerController,
  type TAddPatientGeneralPractitionerControllerOutput,
  type TDeletePatientGeneralPractitionerControllerOutput,
  type TListPatientGeneralPractitionersControllerOutput,
  type TPatchPatientGeneralPractitionerControllerOutput,
} from "@/modules/server/core/patient/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/** Adds a GP reference to a Patient. */
export const addPatientGeneralPractitionerAction = authenticatedProcedure
  .createServerAction()
  .input(AddPatientGPActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TAddPatientGPAction }) => {
    return await runWithTransport<TAddPatientGeneralPractitionerControllerOutput>(async () => {
      const data = await addPatientGeneralPractitionerController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists all GP references for a Patient. */
export const listPatientGeneralPractitionersAction = authenticatedProcedure
  .createServerAction()
  .input(ListPatientGPsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPatientGPsAction }) => {
    return await runWithTransport<TListPatientGeneralPractitionersControllerOutput>(async () => {
      const data = await listPatientGeneralPractitionersController(input.payload);
      return { result: data };
    });
  });

/** Updates a specific GP reference on a Patient. */
export const patchPatientGeneralPractitionerAction = authenticatedProcedure
  .createServerAction()
  .input(PatchPatientGPActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TPatchPatientGPAction }) => {
    return await runWithTransport<TPatchPatientGeneralPractitionerControllerOutput>(async () => {
      const data = await patchPatientGeneralPractitionerController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Removes a specific GP reference from a Patient. */
export const deletePatientGeneralPractitionerAction = authenticatedProcedure
  .createServerAction()
  .input(DeletePatientGPActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePatientGPAction }) => {
    return await runWithTransport<TDeletePatientGeneralPractitionerControllerOutput>(async () => {
      const data = await deletePatientGeneralPractitionerController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
