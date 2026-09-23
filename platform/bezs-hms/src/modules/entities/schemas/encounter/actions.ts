/**
 * Encounter ZSA server action schemas.
 *
 * Layer: entities / schemas / encounter
 *
 * Wraps each validation schema in the { payload, transportOptions? } shape
 * expected by ZSA authenticatedProcedure server actions.
 * Mutating ops include transportOptions for Next.js cache revalidation.
 * Read ops (list, getById) omit transportOptions.
 *
 * Imports from ./input via relative path — avoids circular barrel import.
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreateEncounterValidationSchema,
  UpdateEncounterValidationSchema,
  ListEncountersValidationSchema,
  GetByIdEncounterValidationSchema,
  DeleteEncounterValidationSchema,
} from "./input";

/** Action schema for creating a new Encounter. */
export const CreateEncounterActionSchema = z.object({
  payload: CreateEncounterValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateEncounterAction = z.infer<typeof CreateEncounterActionSchema>;

/** Action schema for listing Encounters with optional filters. */
export const ListEncountersActionSchema = z.object({
  payload: ListEncountersValidationSchema.optional(),
});
export type TListEncountersAction = z.infer<typeof ListEncountersActionSchema>;

/** Action schema for fetching a single Encounter by ID. */
export const GetEncounterByIdActionSchema = z.object({
  payload: GetByIdEncounterValidationSchema,
});
export type TGetEncounterByIdAction = z.infer<typeof GetEncounterByIdActionSchema>;

/** Action schema for patching scalar fields on an Encounter. */
export const UpdateEncounterActionSchema = z.object({
  payload: UpdateEncounterValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateEncounterAction = z.infer<typeof UpdateEncounterActionSchema>;

/** Action schema for deleting an Encounter by ID. */
export const DeleteEncounterActionSchema = z.object({
  payload: DeleteEncounterValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteEncounterAction = z.infer<typeof DeleteEncounterActionSchema>;
