/**
 * HealthcareService server actions — presentation layer ZSA actions.
 *
 * Layer: presentation / actions
 * Resource: HealthcareService
 *
 * All actions use adminProcedure — HealthcareService is an admin-only
 * resource with no patient-facing read path, so every action is gated
 * behind ROLES["telemedicine-admin"] from creation.
 * Mutating actions include transportOptions for revalidation / redirect.
 * Read actions have no transportOptions — no side effects.
 */

"use server";

import {
  CreateHealthcareServiceActionSchema,
  DeleteHealthcareServiceActionSchema,
  GetHealthcareServiceByIdActionSchema,
  ListHealthcareServicesActionSchema,
  UpdateHealthcareServiceActionSchema,
  type TCreateHealthcareServiceAction,
  type TDeleteHealthcareServiceAction,
  type TGetHealthcareServiceByIdAction,
  type TListHealthcareServicesAction,
  type TUpdateHealthcareServiceAction,
} from "@/modules/entities/schemas/healthcare-service";
import {
  createHealthcareServiceController,
  deleteHealthcareServiceController,
  getHealthcareServiceByIdController,
  listHealthcareServicesController,
  updateHealthcareServiceController,
  type TCreateHealthcareServiceControllerOutput,
  type TDeleteHealthcareServiceControllerOutput,
  type TGetHealthcareServiceByIdControllerOutput,
  type TListHealthcareServicesControllerOutput,
  type TUpdateHealthcareServiceControllerOutput,
} from "@/modules/server/core/healthcare-service/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { adminProcedure } from "../procedures";

/** Creates a new healthcare service. Accepts transportOptions for post-create revalidation. */
export const createHealthcareServiceAction = adminProcedure
  .createServerAction()
  .input(CreateHealthcareServiceActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreateHealthcareServiceAction }) => {
    return await runWithTransport<TCreateHealthcareServiceControllerOutput>(
      async () => {
        const data = await createHealthcareServiceController(input.payload);
        return { result: data, transport: input.transportOptions };
      }
    );
  });

/** Lists healthcare services with optional server-side filters and pagination. */
export const listHealthcareServicesAction = adminProcedure
  .createServerAction()
  .input(ListHealthcareServicesActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListHealthcareServicesAction }) => {
    return await runWithTransport<TListHealthcareServicesControllerOutput>(
      async () => {
        const data = await listHealthcareServicesController(input.payload);
        return { result: data };
      }
    );
  });

/** Fetches a single healthcare service by its numeric ID. */
export const getHealthcareServiceByIdAction = adminProcedure
  .createServerAction()
  .input(GetHealthcareServiceByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetHealthcareServiceByIdAction }) => {
    return await runWithTransport<TGetHealthcareServiceByIdControllerOutput>(
      async () => {
        const data = await getHealthcareServiceByIdController(input.payload);
        return { result: data };
      }
    );
  });

/** Partially updates a healthcare service (scalar + photo fields only). */
export const updateHealthcareServiceAction = adminProcedure
  .createServerAction()
  .input(UpdateHealthcareServiceActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateHealthcareServiceAction }) => {
    return await runWithTransport<TUpdateHealthcareServiceControllerOutput>(
      async () => {
        const data = await updateHealthcareServiceController(input.payload);
        return { result: data, transport: input.transportOptions };
      }
    );
  });

/** Permanently deletes a healthcare service. */
export const deleteHealthcareServiceAction = adminProcedure
  .createServerAction()
  .input(DeleteHealthcareServiceActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteHealthcareServiceAction }) => {
    return await runWithTransport<TDeleteHealthcareServiceControllerOutput>(
      async () => {
        await deleteHealthcareServiceController(input.payload);
        return { result: undefined, transport: input.transportOptions };
      }
    );
  });
