/**
 * entities/schemas/dashboard/input — input schemas for dashboard actions.
 *
 * The dashboard endpoint takes no parameters — the org ID is resolved from
 * the auth token on the backend. The schema is a no-op placeholder so the
 * action follows the standard ZSA envelope pattern.
 *
 * @module
 */
import { z } from "zod";

export const GetDashboardParamsSchema = z.object({});
export type TGetDashboardParams = z.infer<typeof GetDashboardParamsSchema>;
