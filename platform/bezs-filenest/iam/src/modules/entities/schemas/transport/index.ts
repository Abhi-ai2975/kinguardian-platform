import z from "zod"
import { ZodERevalidateType } from "../../enums/transportOptions.enum"

export const TransportOptionsSchema = z.object({
  url: z.string().optional(),
  shouldRevalidate: z.boolean().optional(),
  shouldRedirect: z.boolean().optional(),
  revalidateType: ZodERevalidateType.default("page").optional()
})
export type TTransportOptions = z.infer<typeof TransportOptionsSchema>
