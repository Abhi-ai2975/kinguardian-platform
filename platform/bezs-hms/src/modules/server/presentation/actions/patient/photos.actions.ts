/**
 * Patient photo sub-resource server actions — add, list, patch, delete.
 *
 * Layer: presentation / actions
 * Resource: Patient (FHIR R4) — /photos sub-resource
 *
 * All actions use authenticatedProcedure. Mutating actions include
 * transportOptions for cache revalidation; list does not.
 */

"use server";

import {
  AddPatientPhotoActionSchema,
  DeletePatientPhotoActionSchema,
  ListPatientPhotosActionSchema,
  PatchPatientPhotoActionSchema,
  type TAddPatientPhotoAction,
  type TDeletePatientPhotoAction,
  type TListPatientPhotosAction,
  type TPatchPatientPhotoAction,
} from "@/modules/entities/schemas/patient";
import {
  addPatientPhotoController,
  deletePatientPhotoController,
  listPatientPhotosController,
  patchPatientPhotoController,
  type TAddPatientPhotoControllerOutput,
  type TDeletePatientPhotoControllerOutput,
  type TListPatientPhotosControllerOutput,
  type TPatchPatientPhotoControllerOutput,
} from "@/modules/server/core/patient/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/** Adds a photo Attachment to a Patient. */
export const addPatientPhotoAction = authenticatedProcedure
  .createServerAction()
  .input(AddPatientPhotoActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TAddPatientPhotoAction }) => {
    return await runWithTransport<TAddPatientPhotoControllerOutput>(
      async () => {
        const data = await addPatientPhotoController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/** Lists all photo Attachments for a Patient. */
export const listPatientPhotosAction = authenticatedProcedure
  .createServerAction()
  .input(ListPatientPhotosActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPatientPhotosAction }) => {
    return await runWithTransport<TListPatientPhotosControllerOutput>(
      async () => {
        const data = await listPatientPhotosController(input.payload);
        return { result: data };
      },
    );
  });

/** Updates a specific photo Attachment on a Patient. */
export const patchPatientPhotoAction = authenticatedProcedure
  .createServerAction()
  .input(PatchPatientPhotoActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TPatchPatientPhotoAction }) => {
    return await runWithTransport<TPatchPatientPhotoControllerOutput>(
      async () => {
        const data = await patchPatientPhotoController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/** Removes a specific photo Attachment from a Patient. */
export const deletePatientPhotoAction = authenticatedProcedure
  .createServerAction()
  .input(DeletePatientPhotoActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePatientPhotoAction }) => {
    return await runWithTransport<TDeletePatientPhotoControllerOutput>(
      async () => {
        const data = await deletePatientPhotoController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });
