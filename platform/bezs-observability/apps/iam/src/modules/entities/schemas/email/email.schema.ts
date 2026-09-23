import z from "zod"

// validation schemas (used in server actions and controllers)
export const SendEmailValidationSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  html: z.string(),
  from: z.string().email().optional()
})
export type TSendEmailValidationSchema = z.infer<
  typeof SendEmailValidationSchema
>

// ------------------------------------------------------- //

// Server Action Schema
