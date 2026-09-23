import z from "zod";

export const BaseSigninOrSignupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z
    .string()
    .min(4, "Username must be at least 4 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean(),
});
