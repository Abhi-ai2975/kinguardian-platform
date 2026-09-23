/**
 * entities/schemas/transport — shared ZSA transport-options schema.
 *
 * Every mutating server action includes `transportOptions` so the server
 * can call `revalidatePath` or `redirect` after business logic completes.
 * Defined once here — imported by every resource's actions.ts.
 *
 * @module
 */
import { z } from "zod";

export const TransportOptionsSchema = z.object({
  url: z.string().nullish(),
  shouldRevalidate: z.boolean().optional(),
  shouldRedirect: z.boolean().optional(),
  revalidateType: z.enum(["page", "layout"]).optional(),
});

export type TTransportOptions = z.infer<typeof TransportOptionsSchema>;
