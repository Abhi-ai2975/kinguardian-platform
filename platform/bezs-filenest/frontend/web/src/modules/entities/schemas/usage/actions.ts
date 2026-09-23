/**
 * entities/schemas/usage/actions — ZSA action envelope schemas for the usage domain.
 *
 * @module
 */
import { z } from "zod";
import { TransportOptionsSchema } from "../transport";
import { GetUsageParamsSchema } from "./input";

export const GetUsageActionSchema = z.object({
  payload: GetUsageParamsSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TGetUsageAction = z.infer<typeof GetUsageActionSchema>;
