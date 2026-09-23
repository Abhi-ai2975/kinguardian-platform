/**
 * Patient link sub-resource server actions — add, list, patch, delete.
 *
 * Layer: presentation / actions
 * Resource: Patient (FHIR R4) — /links sub-resource
 *
 * All actions use authenticatedProcedure. Mutating actions include
 * transportOptions for cache revalidation; list does not.
 */

"use server";

import {
  AddPatientLinkActionSchema,
  DeletePatientLinkActionSchema,
  ListPatientLinksActionSchema,
  PatchPatientLinkActionSchema,
  type TAddPatientLinkAction,
  type TDeletePatientLinkAction,
  type TListPatientLinksAction,
  type TPatchPatientLinkAction,
} from "@/modules/entities/schemas/patient";
import {
  addPatientLinkController,
  deletePatientLinkController,
  listPatientLinksController,
  patchPatientLinkController,
  type TAddPatientLinkControllerOutput,
  type TDeletePatientLinkControllerOutput,
  type TListPatientLinksControllerOutput,
  type TPatchPatientLinkControllerOutput,
} from "@/modules/server/core/patient/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/** Adds a link (to another Patient or RelatedPerson) to a Patient. */
export const addPatientLinkAction = authenticatedProcedure
  .createServerAction()
  .input(AddPatientLinkActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TAddPatientLinkAction }) => {
    return await runWithTransport<TAddPatientLinkControllerOutput>(async () => {
      const data = await addPatientLinkController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists all links for a Patient. */
export const listPatientLinksAction = authenticatedProcedure
  .createServerAction()
  .input(ListPatientLinksActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPatientLinksAction }) => {
    return await runWithTransport<TListPatientLinksControllerOutput>(async () => {
      const data = await listPatientLinksController(input.payload);
      return { result: data };
    });
  });

/** Updates a specific link on a Patient. */
export const patchPatientLinkAction = authenticatedProcedure
  .createServerAction()
  .input(PatchPatientLinkActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TPatchPatientLinkAction }) => {
    return await runWithTransport<TPatchPatientLinkControllerOutput>(async () => {
      const data = await patchPatientLinkController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Removes a specific link from a Patient. */
export const deletePatientLinkAction = authenticatedProcedure
  .createServerAction()
  .input(DeletePatientLinkActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePatientLinkAction }) => {
    return await runWithTransport<TDeletePatientLinkControllerOutput>(async () => {
      const data = await deletePatientLinkController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
