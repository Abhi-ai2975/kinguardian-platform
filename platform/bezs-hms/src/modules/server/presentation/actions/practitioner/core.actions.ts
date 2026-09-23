/**
 * Practitioner core server actions — create, list, getMe, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: Practitioner (FHIR R4) — core operations
 *
 * `createPractitionerFullAction`/`updatePractitionerFullAction` have a real,
 * non-admin consumer (`DoctorProfileForm.tsx` — doctors editing their own
 * profile) and MUST stay `authenticatedProcedure`. `listPractitionersAction`
 * and `getMyPractitionerAction` are reads with no reason to restrict.
 * `createPractitionerAction` (core-only, no arrays), `getPractitionerByIdAction`,
 * `updatePractitionerAction` (core-only), and `deletePractitionerAction` have
 * zero consumers anywhere — confirmed via a full-repo grep — so they move to
 * `adminProcedure`. Same class of gap fixed on every prior resource this
 * session, but applied carefully here since not every mutation on this
 * resource is admin-only.
 *
 * Mutating actions include transportOptions for cache revalidation; read
 * actions do not.
 */

"use server";

import {
  CreatePractitionerActionSchema,
  CreatePractitionerFullActionSchema,
  DeletePractitionerActionSchema,
  GetPractitionerByIdActionSchema,
  ListPractitionersActionSchema,
  UpdatePractitionerActionSchema,
  UpdatePractitionerFullActionSchema,
  type TCreatePractitionerAction,
  type TCreatePractitionerFullAction,
  type TDeletePractitionerAction,
  type TGetPractitionerByIdAction,
  type TListPractitionersAction,
  type TUpdatePractitionerAction,
  type TUpdatePractitionerFullAction,
} from "@/modules/entities/schemas/practitioner";
import {
  createPractitionerController,
  createPractitionerFullController,
  deletePractitionerController,
  getMyPractitionerController,
  getPractitionerByIdController,
  listPractitionersController,
  updatePractitionerController,
  updatePractitionerFullController,
  type TCreatePractitionerControllerOutput,
  type TCreatePractitionerFullControllerOutput,
  type TGetMyPractitionerControllerOutput,
  type TGetPractitionerByIdControllerOutput,
  type TListPractitionersControllerOutput,
  type TUpdatePractitionerControllerOutput,
  type TUpdatePractitionerFullControllerOutput,
} from "@/modules/server/core/practitioner/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure, adminProcedure } from "../procedures";

/**
 * Atomically creates a Practitioner with sub-resources in a single request.
 * Used by DoctorProfileForm.tsx for self-service profile creation — must
 * stay open to any authenticated user, not admin-only.
 */
export const createPractitionerFullAction = authenticatedProcedure
  .createServerAction()
  .input(CreatePractitionerFullActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreatePractitionerFullAction }) => {
    return await runWithTransport<TCreatePractitionerFullControllerOutput>(
      async () => {
        const data = await createPractitionerFullController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/**
 * Atomically updates a Practitioner's scalar fields and sub-resource arrays
 * in a single request. Used by DoctorProfileForm.tsx for self-service
 * profile editing — must stay open to any authenticated user, not admin-only.
 */
export const updatePractitionerFullAction = authenticatedProcedure
  .createServerAction()
  .input(UpdatePractitionerFullActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdatePractitionerFullAction }) => {
    return await runWithTransport<TUpdatePractitionerFullControllerOutput>(
      async () => {
        const data = await updatePractitionerFullController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/** Creates a new Practitioner record (core scalars only, no arrays). No current consumer; admin-only. */
export const createPractitionerAction = adminProcedure
  .createServerAction()
  .input(CreatePractitionerActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreatePractitionerAction }) => {
    return await runWithTransport<TCreatePractitionerControllerOutput>(
      async () => {
        const data = await createPractitionerController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/** Lists Practitioners with optional server-side filters and pagination. */
export const listPractitionersAction = authenticatedProcedure
  .createServerAction()
  .input(ListPractitionersActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPractitionersAction }) => {
    return await runWithTransport<TListPractitionersControllerOutput>(
      async () => {
        const data = await listPractitionersController(input.payload);
        return { result: data };
      },
    );
  });

/**
 * Fetches the Practitioner record linked to the currently authenticated user.
 * No input required — userId is resolved from the session.
 */
export const getMyPractitionerAction = authenticatedProcedure
  .createServerAction()
  .handler(async () => {
    return await runWithTransport<TGetMyPractitionerControllerOutput>(
      async () => {
        const data = await getMyPractitionerController();
        return { result: data };
      },
    );
  });

/** Fetches a single Practitioner by numeric ID. No current consumer; admin-only. */
export const getPractitionerByIdAction = adminProcedure
  .createServerAction()
  .input(GetPractitionerByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetPractitionerByIdAction }) => {
    return await runWithTransport<TGetPractitionerByIdControllerOutput>(
      async () => {
        const data = await getPractitionerByIdController(input.payload);
        return { result: data };
      },
    );
  });

/** Partially updates scalar fields on a Practitioner (core-only, no arrays). No current consumer; admin-only. */
export const updatePractitionerAction = adminProcedure
  .createServerAction()
  .input(UpdatePractitionerActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdatePractitionerAction }) => {
    return await runWithTransport<TUpdatePractitionerControllerOutput>(
      async () => {
        const data = await updatePractitionerController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/** Permanently removes a Practitioner and all child records. No current consumer; admin-only. */
export const deletePractitionerAction = adminProcedure
  .createServerAction()
  .input(DeletePractitionerActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePractitionerAction }) => {
    return await runWithTransport<void>(async () => {
      await deletePractitionerController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
