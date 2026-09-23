/**
 * entities/schemas/usage/input — input schemas for the usage domain.
 *
 * The GET /v1/usage endpoint takes no parameters (org is from auth token),
 * so input is an empty object.
 *
 * @module
 */
import { z } from "zod";

export const GetUsageParamsSchema = z.object({});
export type TGetUsageParams = z.infer<typeof GetUsageParamsSchema>;
