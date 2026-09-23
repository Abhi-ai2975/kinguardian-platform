/**
 * entities/schemas/dashboard/actions — ZSA action envelope schemas for the dashboard.
 *
 * @module
 */
import { z } from "zod";
import { TransportOptionsSchema } from "../transport";
import { GetDashboardParamsSchema } from "./input";

export const GetDashboardActionSchema = z.object({
  payload: GetDashboardParamsSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TGetDashboardAction = z.infer<typeof GetDashboardActionSchema>;
