/**
 * Location server actions — presentation layer ZSA actions.
 *
 * Layer: presentation / actions
 * Resource: Location
 *
 * All actions use adminProcedure — Location is an admin-only resource with
 * no patient-facing read path, so every action is gated behind
 * ROLES["telemedicine-admin"] from creation.
 * Mutating actions include transportOptions for revalidation / redirect.
 * Read actions have no transportOptions — no side effects.
 */

"use server";

import {
  CreateLocationActionSchema,
  DeleteLocationActionSchema,
  GetLocationByIdActionSchema,
  ListLocationsActionSchema,
  UpdateLocationActionSchema,
  type TCreateLocationAction,
  type TDeleteLocationAction,
  type TGetLocationByIdAction,
  type TListLocationsAction,
  type TUpdateLocationAction,
} from "@/modules/entities/schemas/location";
import {
  createLocationController,
  deleteLocationController,
  getLocationByIdController,
  listLocationsController,
  updateLocationController,
  type TCreateLocationControllerOutput,
  type TDeleteLocationControllerOutput,
  type TGetLocationByIdControllerOutput,
  type TListLocationsControllerOutput,
  type TUpdateLocationControllerOutput,
} from "@/modules/server/core/location/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { adminProcedure } from "../procedures";

/** Creates a new location. Accepts transportOptions for post-create revalidation. */
export const createLocationAction = adminProcedure
  .createServerAction()
  .input(CreateLocationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreateLocationAction }) => {
    return await runWithTransport<TCreateLocationControllerOutput>(
      async () => {
        const data = await createLocationController(input.payload);
        return { result: data, transport: input.transportOptions };
      }
    );
  });

/** Lists locations with optional server-side filters and pagination. */
export const listLocationsAction = adminProcedure
  .createServerAction()
  .input(ListLocationsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListLocationsAction }) => {
    return await runWithTransport<TListLocationsControllerOutput>(
      async () => {
        const data = await listLocationsController(input.payload);
        return { result: data };
      }
    );
  });

/** Fetches a single location by its numeric ID. */
export const getLocationByIdAction = adminProcedure
  .createServerAction()
  .input(GetLocationByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetLocationByIdAction }) => {
    return await runWithTransport<TGetLocationByIdControllerOutput>(
      async () => {
        const data = await getLocationByIdController(input.payload);
        return { result: data };
      }
    );
  });

/** Partially updates a location (scalar fields only — see PatchLocationDtoSchema). */
export const updateLocationAction = adminProcedure
  .createServerAction()
  .input(UpdateLocationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateLocationAction }) => {
    return await runWithTransport<TUpdateLocationControllerOutput>(
      async () => {
        const data = await updateLocationController(input.payload);
        return { result: data, transport: input.transportOptions };
      }
    );
  });

/** Permanently deletes a location. */
export const deleteLocationAction = adminProcedure
  .createServerAction()
  .input(DeleteLocationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteLocationAction }) => {
    return await runWithTransport<TDeleteLocationControllerOutput>(
      async () => {
        await deleteLocationController(input.payload);
        return { result: undefined, transport: input.transportOptions };
      }
    );
  });
