/**
 * @file entities/schemas/transport/index.ts
 * @description Canonical location for the ZSA transport-options schema.
 *
 * Every mutating server action (create / update / delete) includes
 * `transportOptions` in its action schema so the server can run
 * `revalidatePath` or `redirect` after the business logic completes.
 * Defining it once here prevents the identical copy from being duplicated
 * in every resource schema file.
 *
 * Layer: entities / schemas / transport
 */

import { z } from "zod";

/**
 * Optional transport controls forwarded through a ZSA server action.
 * The server-side `runWithTransport` reads these to decide whether to
 * call `revalidatePath`, trigger a redirect, or do nothing.
 *
 * @property url              - Path to revalidate or redirect to.
 * @property shouldRevalidate - When true, calls `revalidatePath(url, revalidateType)`.
 * @property shouldRedirect   - When true, calls `redirect(url)` after the action.
 * @property revalidateType   - `"page"` (default) or `"layout"` revalidation scope.
 */
export const TransportOptionsSchema = z.object({
  url: z.string().nullish(),
  shouldRevalidate: z.boolean().optional(),
  shouldRedirect: z.boolean().optional(),
  revalidateType: z.enum(["page", "layout"]).optional(),
});
export type TTransportOptions = z.infer<typeof TransportOptionsSchema>;
